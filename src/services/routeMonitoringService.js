import pool from '../db.js';
import alertService from './alertService.js';
import config from '../config/index.js';

class RouteMonitoringService {
  constructor() {
    this.driverLastUpdate = new Map(); // Track last GPS update time
    this.driverRoutes = new Map(); // Cache active routes
  }

  // Monitor driver's GPS updates
  async monitorGPS(driverId, location, tripId = null) {
    const now = Date.now();
    const lastUpdate = this.driverLastUpdate.get(driverId);
    
    // Update last seen time
    this.driverLastUpdate.set(driverId, now);

    // Store GPS log
    await this.logGPSData(driverId, location, tripId);

    // Check for timeout if we haven't seen the driver in a while
    if (lastUpdate && (now - lastUpdate > config.gps.timeoutThreshold)) {
      await alertService.createAlert({
        type: 'no_gps',
        severity: 'warning',
        driverId,
        tripId,
        metadata: {
          lastUpdate,
          duration: Math.round((now - lastUpdate) / 60000) // minutes
        }
      });
    }

    // If there's an active trip, check route deviation
    if (tripId) {
      await this.checkRouteDeviation(driverId, location, tripId);
    }
  }

  // Log GPS data for heatmap
  async logGPSData(driverId, location, tripId = null) {
    await pool.query(
      `INSERT INTO gps_logs (
        driver_id, lat, lng, trip_id,
        speed, heading, accuracy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        driverId,
        location.lat,
        location.lng,
        tripId,
        location.speed || null,
        location.heading || null,
        location.accuracy || null
      ]
    );
  }

  // Check if driver has deviated from route
  async checkRouteDeviation(driverId, location, tripId) {
    // Get or load route from cache
    let route = this.driverRoutes.get(tripId);
    if (!route) {
      const result = await pool.query(
        'SELECT route_points FROM driver_routes WHERE trip_id = $1',
        [tripId]
      );
      if (result.rows.length) {
        route = result.rows[0].route_points;
        this.driverRoutes.set(tripId, route);
      }
    }

    if (route) {
      // Find nearest point on route
      const nearestPoint = this.findNearestRoutePoint(location, route);
      const deviation = this.calculateDistance(
        location.lat,
        location.lng,
        nearestPoint.lat,
        nearestPoint.lng
      );

      // Alert if deviation exceeds threshold
      if (deviation > config.route.deviationThreshold) {
        await alertService.createAlert({
          type: 'route_deviation',
          severity: 'warning',
          driverId,
          tripId,
          metadata: {
            currentLocation: location,
            deviation: Math.round(deviation),
            expectedLocation: nearestPoint
          }
        });
      }
    }
  }

  // Get heatmap data for driver
  async getHeatmapData(driverId, startTime = null, endTime = null) {
    let query = `
      SELECT 
        lat, lng, 
        COUNT(*) as weight,
        DATE_TRUNC('hour', timestamp) as time_group
      FROM gps_logs
      WHERE driver_id = $1
    `;
    const params = [driverId];

    if (startTime) {
      query += ' AND timestamp >= $2';
      params.push(startTime);
    }
    if (endTime) {
      query += ' AND timestamp <= $' + (params.length + 1);
      params.push(endTime);
    }

    query += `
      GROUP BY lat, lng, time_group
      ORDER BY time_group DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = this.toRadians(lat1);
    const φ2 = this.toRadians(lat2);
    const Δφ = this.toRadians(lat2 - lat1);
    const Δλ = this.toRadians(lon2 - lon1);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  // Find nearest point on route
  findNearestRoutePoint(location, routePoints) {
    return routePoints.reduce((nearest, point) => {
      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        point.lat,
        point.lng
      );
      if (distance < nearest.distance) {
        return { ...point, distance };
      }
      return nearest;
    }, { distance: Infinity });
  }

  // Clear route cache for trip
  clearRouteCache(tripId) {
    this.driverRoutes.delete(tripId);
  }
}

export default new RouteMonitoringService();
