import OneSignal from '@onesignal/node-onesignal';
import pool from '../db.js';
import config from '../config/index.js';
import { getWebSocketService } from './websocketService.js';
import { i18n } from '../utils/i18n.js';

const oneSignal = new OneSignal.Client(
  config.oneSignal.appId,
  config.oneSignal.apiKey
);

class AlertService {
  constructor() {
    this.wsService = getWebSocketService();
  }

  // Create and send alert
  async createAlert(alertData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create alert record
      const result = await client.query(
        `INSERT INTO alerts (type, severity, metadata, driver_id, trip_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          alertData.type,
          alertData.severity,
          alertData.metadata,
          alertData.driverId,
          alertData.tripId
        ]
      );

      const alert = result.rows[0];

      // Get subscribed users
      const subs = await client.query(
        `SELECT 
           u.id,
           u.device_tokens,
           u.language,
           s.notification_channels
         FROM alert_subscriptions s
         JOIN users u ON u.id = s.user_id
         WHERE $1 = ANY(s.alert_types)`,
        [alert.type]
      );

      // Send notifications
      await Promise.all(subs.rows.map(async (sub) => {
        // Translate alert message based on user's language
        const message = i18n.translate(
          `alerts.${alert.type}`,
          sub.language,
          alertData.metadata
        );

        // Send in-app notification via WebSocket
        if (sub.notification_channels.includes('websocket')) {
          this.wsService.broadcastNotification(sub.id, {
            type: 'alert',
            alert: {
              ...alert,
              message
            }
          });
        }

        // Send push notification via OneSignal
        if (sub.notification_channels.includes('push') && sub.device_tokens?.length) {
          await oneSignal.createNotification({
            include_player_ids: sub.device_tokens,
            contents: {
              en: message
            },
            data: {
              alertId: alert.id,
              type: alert.type,
              metadata: alert.metadata
            }
          });
        }
      }));

      await client.query('COMMIT');
      return alert;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Check for route deviation
  async checkRouteDeviation(driverId, currentLocation, tripId) {
    const client = await pool.connect();
    try {
      // Get current trip route
      const tripRoute = await client.query(
        `SELECT route_points FROM driver_routes
         WHERE trip_id = $1`,
        [tripId]
      );

      if (!tripRoute.rows.length) return false;

      const route = tripRoute.rows[0].route_points;
      
      // Find nearest point on route
      const nearestPoint = this.findNearestPoint(currentLocation, route);
      const deviation = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        nearestPoint.lat,
        nearestPoint.lng
      );

      // If deviation is more than 500 meters
      if (deviation > 0.5) {
        await this.createAlert({
          type: 'route_deviation',
          severity: 'warning',
          driverId,
          tripId,
          metadata: {
            currentLocation,
            deviation,
            expectedLocation: nearestPoint
          }
        });
        return true;
      }

      return false;
    } finally {
      client.release();
    }
  }

  // Check for late arrival
  async checkLateArrival(tripId) {
    const client = await pool.connect();
    try {
      const trip = await client.query(
        `SELECT t.*, d.current_location_lat, d.current_location_lng
         FROM trips t
         JOIN drivers d ON d.id = t.driver_id
         WHERE t.id = $1`,
        [tripId]
      );

      if (!trip.rows.length) return false;

      const tripData = trip.rows[0];
      const currentLocation = {
        lat: tripData.current_location_lat,
        lng: tripData.current_location_lng
      };

      // Calculate ETA using current location
      const eta = await this.calculateETA(currentLocation, tripData);
      const scheduledTime = new Date(tripData.scheduled_at);
      
      // If ETA is more than 10 minutes late
      if (eta > scheduledTime.getTime() + 10 * 60 * 1000) {
        await this.createAlert({
          type: 'late_arrival',
          severity: 'warning',
          driverId: tripData.driver_id,
          tripId,
          metadata: {
            eta: new Date(eta),
            scheduledTime,
            delay: Math.round((eta - scheduledTime.getTime()) / 60000)
          }
        });
        return true;
      }

      return false;
    } finally {
      client.release();
    }
  }

  // Helper: Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(deg) {
    return deg * Math.PI / 180;
  }

  // Helper: Find nearest point on route
  findNearestPoint(point, route) {
    return route.reduce((nearest, current) => {
      const distance = this.calculateDistance(
        point.lat,
        point.lng,
        current.lat,
        current.lng
      );
      if (distance < nearest.distance) {
        return { ...current, distance };
      }
      return nearest;
    }, { distance: Infinity });
  }
}

export default new AlertService();
