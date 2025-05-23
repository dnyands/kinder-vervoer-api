import pool from '../db.js';
import config from '../config/index.js';
import * as OneSignal from '@onesignal/node-onesignal';

const configuration = OneSignal.createConfiguration({
  appKey: config.oneSignal.apiKey,
  userKey: config.oneSignal.apiKey
});

const oneSignal = new OneSignal.DefaultApi(configuration);

export const addDeviceToken = async (userId, token) => {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE users 
       SET device_tokens = ARRAY_APPEND(
         COALESCE(device_tokens, ARRAY[]::TEXT[]), 
         $1
       )
       WHERE id = $2 AND NOT $1 = ANY(COALESCE(device_tokens, ARRAY[]::TEXT[]))`,
      [token, userId]
    );
  } finally {
    client.release();
  }
};

export const removeDeviceToken = async (userId, token) => {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE users 
       SET device_tokens = ARRAY_REMOVE(device_tokens, $1)
       WHERE id = $2`,
      [token, userId]
    );
  } finally {
    client.release();
  }
};

export const sendNotification = async (userId, title, body, data = {}) => {
  const client = await pool.connect();
  try {
    // Get user's device tokens
    const result = await client.query(
      'SELECT device_tokens FROM users WHERE id = $1',
      [userId]
    );

    const deviceTokens = result.rows[0]?.device_tokens || [];
    if (!deviceTokens.length) return;

    // Create notification record
    const notificationResult = await client.query(
      `INSERT INTO notifications (user_id, title, body, data)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, title, body, JSON.stringify(data)]
    );

    // Send notification via OneSignal
    const notification = new OneSignal.Notification();
    notification.app_id = config.oneSignal.appId;
    notification.include_player_ids = deviceTokens;
    notification.headings = { en: title };
    notification.contents = { en: body };
    notification.data = {
      ...data,
      notificationId: notificationResult.rows[0].id.toString()
    };

    try {
      await oneSignal.createNotification(notification);
      
      // Update notification status
      await client.query(
        `UPDATE notifications 
         SET status = $1, sent_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        ['sent', notificationResult.rows[0].id]
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      await client.query(
        `UPDATE notifications 
         SET status = $1, sent_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        ['failed', notificationResult.rows[0].id]
      );
    }
  } finally {
    client.release();
  }
};


// Helper function to format attendance notifications
export const sendAttendanceNotification = async (studentId, status, driverId) => {
  const client = await pool.connect();
  try {
    // Get student, parent, and driver details
    const result = await client.query(
      `SELECT 
        s.id as student_id,
        s.first_name as student_name,
        p.id as parent_id,
        d.id as driver_id,
        du.first_name as driver_first_name,
        du.last_name as driver_last_name,
        sc.name as school_name
       FROM students s
       JOIN users p ON p.id = s.parent_id
       JOIN drivers d ON d.id = $3
       JOIN users du ON du.id = d.user_id
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = $1`,
      [studentId, status, driverId]
    );

    if (!result.rows.length) return;

    const {
      student_name,
      parent_id,
      driver_first_name,
      driver_last_name,
      school_name
    } = result.rows[0];

    const driverName = `${driver_first_name} ${driver_last_name}`;
    const time = new Date().toLocaleTimeString();
    let title, body;

    if (status === 'picked_up') {
      title = 'Student Picked Up';
      body = `${student_name} has been picked up by ${driverName} at ${time}`;
    } else if (status === 'dropped_off') {
      title = 'Student Dropped Off';
      body = `${student_name} has been dropped off at ${school_name} by ${driverName} at ${time}`;
    }

    await sendNotification(parent_id, title, body, {
      type: 'attendance',
      studentId,
      status,
      driverId,
      timestamp: new Date().toISOString()
    });
  } finally {
    client.release();
  }
};
