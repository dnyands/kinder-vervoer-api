import { Client } from '@googlemaps/google-maps-services-js';
import config from '../config/index.js';
import pool from '../db.js';

const googleMapsClient = new Client({});

// Helper function to calculate distance between two points
const calculateDistance = (point1, point2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.lat * Math.PI / 180;
  const φ2 = point2.lat * Math.PI / 180;
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
  const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Helper function to find nearest unvisited point
const findNearestPoint = (current, points, visited) => {
  let nearest = null;
  let minDistance = Infinity;

  points.forEach((point, index) => {
    if (!visited.has(index)) {
      const distance = calculateDistance(current, point);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { point, index };
      }
    }
  });

  return nearest;
};

export const optimizeRoute = async (driverId, schoolId, studentIds) => {
  const client = await pool.connect();
  try {
    // Get school location
    const schoolResult = await client.query(
      `SELECT name, address, location_lat, location_lng 
       FROM schools WHERE id = $1`,
      [schoolId]
    );
    const school = schoolResult.rows[0];

    // Get student addresses
    const studentResult = await client.query(
      `SELECT s.id, s.first_name, s.last_name, s.address,
              s.location_lat, s.location_lng
       FROM students s
       WHERE s.id = ANY($1::int[])`,
      [studentIds]
    );
    const students = studentResult.rows;

    // Create waypoints array for Google Maps
    const waypoints = students.map(student => ({
      location: { lat: student.location_lat, lng: student.location_lng },
      stopover: true
    }));

    // Get optimized route from Google Maps
    const response = await googleMapsClient.directions({
      params: {
        origin: { lat: school.location_lat, lng: school.location_lng },
        destination: { lat: school.location_lat, lng: school.location_lng },
        waypoints: waypoints,
        optimize: true,
        mode: 'driving',
        key: config.google.mapsApiKey
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error('Failed to optimize route');
    }

    const route = response.data.routes[0];
    const optimizedOrder = route.waypoint_order;
    const optimizedStudents = optimizedOrder.map(index => students[index]);

    // Calculate time windows based on school start time
    const schoolStartTime = '08:00'; // This should come from school settings
    const baseDate = new Date();
    baseDate.setHours(8, 0, 0, 0);

    const legs = route.legs;
    let currentTime = new Date(baseDate);
    currentTime.setMinutes(currentTime.getMinutes() - legs[0].duration.value / 60);

    const timeWindows = optimizedStudents.map((student, index) => {
      const pickupTime = new Date(currentTime);
      currentTime.setSeconds(currentTime.getSeconds() + legs[index].duration.value);
      return {
        studentId: student.id,
        estimatedPickupTime: pickupTime.toISOString(),
        legDuration: legs[index].duration.value,
        legDistance: legs[index].distance.value
      };
    });

    // Store the optimized route
    const routeData = {
      overview_polyline: route.overview_polyline,
      bounds: route.bounds,
      total_distance: legs.reduce((sum, leg) => sum + leg.distance.value, 0),
      total_duration: legs.reduce((sum, leg) => sum + leg.duration.value, 0),
      legs: legs.map(leg => ({
        distance: leg.distance,
        duration: leg.duration,
        start_location: leg.start_location,
        end_location: leg.end_location
      }))
    };

    const result = await client.query(
      `INSERT INTO driver_routes 
        (driver_id, school_id, student_ids, route_data, 
         estimated_duration, estimated_distance, waypoints, polyline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        driverId,
        schoolId,
        studentIds,
        routeData,
        routeData.total_duration,
        routeData.total_distance,
        { stops: timeWindows },
        routeData.overview_polyline
      ]
    );

    return {
      routeId: result.rows[0].id,
      school,
      students: optimizedStudents,
      timeWindows,
      routeData
    };
  } finally {
    client.release();
  }
};

export const getDriverRoute = async (driverId, schoolId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM driver_routes
       WHERE driver_id = $1 
       AND school_id = $2
       AND is_active = true
       ORDER BY last_generated_at DESC
       LIMIT 1`,
      [driverId, schoolId]
    );

    if (!result.rows.length) {
      return null;
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

export const shouldRegenerateRoute = async (routeId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT last_generated_at FROM driver_routes WHERE id = $1`,
      [routeId]
    );

    if (!result.rows.length) {
      return true;
    }

    const lastGenerated = new Date(result.rows[0].last_generated_at);
    const now = new Date();
    const hoursSinceLastGeneration = (now - lastGenerated) / (1000 * 60 * 60);

    // Regenerate if more than 24 hours old
    return hoursSinceLastGeneration > 24;
  } finally {
    client.release();
  }
};
