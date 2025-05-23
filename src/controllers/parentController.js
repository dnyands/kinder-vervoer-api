import pool from '../db.js';
import { getWebSocketService } from '../services/websocketService.js';
import { ValidationError } from '../utils/errors.js';

export const getDashboard = async (req, res) => {
  const parentId = req.user.id;
  const client = await pool.connect();

  try {
    // Get parent's students and their details
    const result = await client.query(
      `SELECT * FROM parent_dashboard_view WHERE parent_id = $1`,
      [parentId]
    );

    // Get recent attendance records
    const attendanceResult = await client.query(
      `SELECT 
        sa.id,
        sa.student_id,
        sa.status,
        sa.timestamp,
        sa.location_lat,
        sa.location_lng
       FROM student_attendance sa
       JOIN students s ON s.id = sa.student_id
       WHERE s.parent_id = $1
       ORDER BY sa.timestamp DESC
       LIMIT 10`,
      [parentId]
    );

    // Get pending schedule change requests
    const scheduleResult = await client.query(
      `SELECT 
        id,
        student_id,
        current_schedule,
        requested_schedule,
        status,
        created_at
       FROM schedule_change_requests
       WHERE parent_id = $1
       AND status = 'pending'
       ORDER BY created_at DESC`,
      [parentId]
    );

    // Format response
    const dashboard = {
      students: result.rows.map(row => ({
        id: row.student_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        school: {
          id: row.school_id,
          name: row.school_name
        },
        driver: row.driver_id ? {
          id: row.driver_id,
          firstName: row.driver_first_name,
          lastName: row.driver_last_name,
          vehicle: {
            type: row.vehicle_type,
            model: row.vehicle_model,
            licensePlate: row.license_plate
          },
          rating: row.driver_rating,
          documents: row.driver_documents || [],
          currentLocation: row.current_location_lat ? {
            lat: row.current_location_lat,
            lng: row.current_location_lng,
            lastUpdate: row.last_location_update
          } : null
        } : null
      })),
      recentAttendance: attendanceResult.rows,
      pendingRequests: scheduleResult.rows
    };

    res.json(dashboard);
  } finally {
    client.release();
  }
};

export const getStudentAttendance = async (req, res) => {
  const parentId = req.user.id;
  const studentId = parseInt(req.params.id);
  const { startDate, endDate, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const client = await pool.connect();
  try {
    // Verify parent owns this student
    const studentCheck = await client.query(
      'SELECT id FROM students WHERE id = $1 AND parent_id = $2',
      [studentId, parentId]
    );

    if (!studentCheck.rows.length) {
      throw new ValidationError('Student not found or not authorized');
    }

    // Build query conditions
    const conditions = ['student_id = $1'];
    const params = [studentId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      conditions.push(`timestamp >= $${paramCount}`);
      params.push(new Date(startDate));
    }

    if (endDate) {
      paramCount++;
      conditions.push(`timestamp <= $${paramCount}`);
      params.push(new Date(endDate));
    }

    // Get attendance records
    const result = await client.query(
      `SELECT 
        sa.*,
        d.id as driver_id,
        u.first_name as driver_first_name,
        u.last_name as driver_last_name
       FROM student_attendance sa
       LEFT JOIN drivers d ON d.id = sa.driver_id
       LEFT JOIN users u ON u.id = d.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY sa.timestamp DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) 
       FROM student_attendance 
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    res.json({
      attendance: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } finally {
    client.release();
  }
};

export const subscribeToDriverLocation = async (req, res) => {
  const parentId = req.user.id;
  const driverId = parseInt(req.params.id);

  const client = await pool.connect();
  try {
    // Verify parent's child is assigned to this driver
    const driverCheck = await client.query(
      `SELECT d.* FROM drivers d
       JOIN students s ON s.driver_id = d.id
       WHERE d.id = $1 AND s.parent_id = $2`,
      [driverId, parentId]
    );

    if (!driverCheck.rows.length) {
      throw new ValidationError('Driver not found or not authorized');
    }

    // Subscribe to driver's location updates via WebSocket
    const wsService = getWebSocketService();
    wsService.subscribeToDriver(parentId, driverId);

    // Return current location if available
    const driver = driverCheck.rows[0];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const location = driver.last_location_update && driver.last_location_update >= oneHourAgo
      ? {
          lat: driver.current_location_lat,
          lng: driver.current_location_lng,
          lastUpdate: driver.last_location_update
        }
      : null;

    res.json({
      driverId,
      location,
      subscribed: true
    });
  } finally {
    client.release();
  }
};

export const getDriverLocation = async (req, res) => {
  const parentId = req.user.id;
  const driverId = parseInt(req.params.id);

  const client = await pool.connect();
  try {
    // Verify parent's child is assigned to this driver
    const driverCheck = await client.query(
      `SELECT d.* FROM drivers d
       JOIN students s ON s.driver_id = d.id
       WHERE d.id = $1 AND s.parent_id = $2`,
      [driverId, parentId]
    );

    if (!driverCheck.rows.length) {
      throw new ValidationError('Driver not found or not authorized');
    }

    const driver = driverCheck.rows[0];

    // Only return location if it was updated in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (!driver.last_location_update || driver.last_location_update < oneHourAgo) {
      return res.json({
        driverId,
        location: null,
        lastUpdate: driver.last_location_update
      });
    }

    res.json({
      driverId,
      location: {
        lat: driver.current_location_lat,
        lng: driver.current_location_lng
      },
      lastUpdate: driver.last_location_update
    });
  } finally {
    client.release();
  }
};

export const requestScheduleChange = async (req, res) => {
  const parentId = req.user.id;
  const { studentId, currentSchedule, requestedSchedule, reason } = req.body;

  if (!studentId || !requestedSchedule) {
    throw new ValidationError('Student ID and requested schedule are required');
  }

  const client = await pool.connect();
  try {
    // Verify parent owns this student
    const studentCheck = await client.query(
      'SELECT id FROM students WHERE id = $1 AND parent_id = $2',
      [studentId, parentId]
    );

    if (!studentCheck.rows.length) {
      throw new ValidationError('Student not found or not authorized');
    }

    const result = await client.query(
      `INSERT INTO schedule_change_requests 
        (student_id, parent_id, current_schedule, requested_schedule, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [studentId, parentId, currentSchedule, requestedSchedule, reason]
    );

    res.status(201).json(result.rows[0]);
  } finally {
    client.release();
  }
};
