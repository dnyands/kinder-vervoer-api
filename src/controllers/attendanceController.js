import pool from '../db.js';
import { ValidationError } from '../utils/errors.js';
import { sendAttendanceNotification } from '../services/notificationService.js';

export const markAttendance = async (req, res) => {
  const client = await pool.connect();
  try {
    const { studentId, status, locationLat, locationLng } = req.body;
    const driverId = req.user.id;

    // Validate input
    if (!studentId || !status) {
      throw new ValidationError('Student ID and status are required');
    }

    if (!['picked_up', 'dropped_off', 'missed'].includes(status)) {
      throw new ValidationError('Invalid status. Must be picked_up, dropped_off, or missed');
    }

    // Validate driver assignment
    const isAssigned = await client.query(
      'SELECT validate_student_driver_assignment($1, $2) as is_valid',
      [studentId, driverId]
    );

    if (!isAssigned.rows[0].is_valid) {
      throw new ValidationError('You are not assigned to this student');
    }

    // Get student's school_id
    const schoolResult = await client.query(
      'SELECT school_id FROM students WHERE id = $1',
      [studentId]
    );

    if (!schoolResult.rows.length) {
      throw new ValidationError('Student not found');
    }

    // Create attendance record
    const result = await client.query(
      `INSERT INTO student_attendance 
        (student_id, driver_id, school_id, status, location_lat, location_lng)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, timestamp, status`,
      [
        studentId,
        driverId,
        schoolResult.rows[0].school_id,
        status,
        locationLat || null,
        locationLng || null
      ]
    );

    const attendance = result.rows[0];
    
    // Send notification to parent
    await sendAttendanceNotification(studentId, status, driverId);

    res.status(201).json(attendance);
  } finally {
    client.release();
  }
};

export const getStudentAttendance = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: studentId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        sa.id,
        sa.timestamp,
        sa.status,
        sa.location_lat,
        sa.location_lng,
        d.id as driver_id,
        u.first_name as driver_first_name,
        u.last_name as driver_last_name,
        s.name as school_name
      FROM student_attendance sa
      JOIN drivers d ON d.id = sa.driver_id
      JOIN users u ON u.id = d.user_id
      JOIN schools s ON s.id = sa.school_id
      WHERE sa.student_id = $1
    `;

    const params = [studentId];

    if (startDate && endDate) {
      query += ' AND sa.timestamp BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY sa.timestamp DESC';

    const result = await client.query(query, params);

    // Get summary statistics
    const stats = await client.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'picked_up') as total_pickups,
        COUNT(*) FILTER (WHERE status = 'dropped_off') as total_dropoffs,
        COUNT(*) FILTER (WHERE status = 'missed') as total_missed
       FROM student_attendance
       WHERE student_id = $1
       ${startDate && endDate ? 'AND timestamp BETWEEN $2 AND $3' : ''}`,
      params
    );

    res.json({
      attendance: result.rows,
      statistics: stats.rows[0]
    });
  } finally {
    client.release();
  }
};

export const getDailyAttendanceSummary = async (req, res) => {
  const client = await pool.connect();
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];

    const result = await client.query(
      `SELECT 
        das.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        sc.name as school_name,
        d.id as driver_id,
        u.first_name as driver_first_name,
        u.last_name as driver_last_name
       FROM daily_attendance_summary das
       JOIN students s ON s.id = das.student_id
       JOIN schools sc ON sc.id = das.school_id
       JOIN drivers d ON d.id = das.driver_id
       JOIN users u ON u.id = d.user_id
       WHERE das.date = $1
       ORDER BY sc.name, s.last_name, s.first_name`,
      [queryDate]
    );

    res.json(result.rows);
  } finally {
    client.release();
  }
};
