import pool from '../db.js';
import { ValidationError } from '../utils/errors.js';
import { getWebSocketService } from './websocketService.js';

class TripService {
  // Request a new trip
  async requestTrip(tripData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify student belongs to parent
      const studentCheck = await client.query(
        'SELECT id FROM students WHERE id = $1 AND parent_id = $2',
        [tripData.studentId, tripData.parentId]
      );

      if (!studentCheck.rows.length) {
        throw new ValidationError('Student not found or unauthorized');
      }

      // Create trip
      const result = await client.query(
        `INSERT INTO trips (
          student_id, school_id, trip_type, scheduled_at,
          is_recurring, recurrence_pattern, parent_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING *`,
        [
          tripData.studentId,
          tripData.schoolId,
          tripData.tripType,
          tripData.scheduledAt,
          tripData.isRecurring || false,
          tripData.recurrencePattern || null,
          tripData.parentId
        ]
      );

      const trip = result.rows[0];

      // If recurring, create future trips
      if (tripData.isRecurring && tripData.recurrencePattern) {
        await this.createRecurringTrips(client, trip);
      }

      await client.query('COMMIT');
      return trip;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Assign driver to trip
  async assignTrip(tripId, driverId) {
    const client = await pool.connect();
    try {
      // Check driver status
      const driverCheck = await client.query(
        `SELECT d.* FROM drivers d
         WHERE d.id = $1 
         AND d.is_active = true 
         AND d.subscription_status = 'active'
         AND (
           d.license_expiry > CURRENT_DATE
           AND d.registration_expiry > CURRENT_DATE
         )`,
        [driverId]
      );

      if (!driverCheck.rows.length) {
        throw new ValidationError('Driver not available or not authorized');
      }

      // Update trip
      const result = await client.query(
        `UPDATE trips 
         SET driver_id = $1, status = 'assigned', updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [driverId, tripId]
      );

      if (!result.rows.length) {
        throw new ValidationError('Trip not found');
      }

      const trip = result.rows[0];

      // Notify driver via WebSocket
      const wsService = getWebSocketService();
      wsService.broadcastNotification(driverId, {
        type: 'trip_assigned',
        trip
      });

      return trip;
    } finally {
      client.release();
    }
  }

  // Get driver's trips for today
  async getDriverTrips(driverId, date = new Date()) {
    const result = await pool.query(
      `SELECT t.*, 
              s.first_name as student_first_name,
              s.last_name as student_last_name,
              s.pickup_address,
              s.dropoff_address,
              sc.name as school_name,
              sc.address as school_address
       FROM trips t
       JOIN students s ON s.id = t.student_id
       JOIN schools sc ON sc.id = t.school_id
       WHERE t.driver_id = $1
       AND DATE(t.scheduled_at) = DATE($2)
       ORDER BY t.scheduled_at ASC`,
      [driverId, date]
    );

    return result.rows;
  }

  // Create recurring trips
  async createRecurringTrips(client, baseTrip) {
    const pattern = baseTrip.recurrence_pattern;
    const futureTrips = [];
    let currentDate = new Date(baseTrip.scheduled_at);
    
    // Create trips for the next 30 days
    for (let i = 0; i < 30; i++) {
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Check if day matches recurrence pattern
      if (pattern.days.includes(currentDate.getDay())) {
        futureTrips.push({
          student_id: baseTrip.student_id,
          school_id: baseTrip.school_id,
          trip_type: baseTrip.trip_type,
          scheduled_at: currentDate,
          is_recurring: true,
          recurrence_pattern: pattern,
          parent_id: baseTrip.parent_id,
          status: 'pending'
        });
      }
    }

    // Batch insert future trips
    if (futureTrips.length > 0) {
      const values = futureTrips.map((_, i) => 
        `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
      ).join(',');

      const flatParams = futureTrips.flatMap(trip => [
        trip.student_id,
        trip.school_id,
        trip.trip_type,
        trip.scheduled_at,
        trip.is_recurring,
        trip.recurrence_pattern,
        trip.parent_id,
        trip.status
      ]);

      await client.query(
        `INSERT INTO trips (
          student_id, school_id, trip_type, scheduled_at,
          is_recurring, recurrence_pattern, parent_id, status
        ) VALUES ${values}`,
        flatParams
      );
    }
  }
}

export default new TripService();
