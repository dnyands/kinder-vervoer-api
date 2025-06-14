import { Client } from '@googlemaps/google-maps-services-js';

const mapsClient = new Client({});

export const calculateRoute = async (students) => {
  try {
    // Extract addresses for waypoints
    const waypoints = students.map(s => ({
      location: s.pickup_address,
      stopover: true
    }));
    
    // Calculate optimal route using Google Maps Directions API
    const response = await mapsClient.directions({
      params: {
        origin: waypoints[0].location,
        destination: students[0].dropoff_address, // School address
        waypoints: waypoints.slice(1),
        optimize: true,
        mode: 'driving',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    // Get optimized waypoint order
    const order = response.data.routes[0].waypoint_order;
    
    // Return students in optimized order
    return order.map(index => ({
      studentId: students[index].id,
      pickupAddress: students[index].pickup_address
    }));
  } catch (error) {
    console.error('Route calculation error:', error);
    throw new Error('Failed to calculate optimal route');
  }
};
