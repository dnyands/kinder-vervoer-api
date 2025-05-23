import { 
  addDeviceToken, 
  removeDeviceToken, 
  sendNotification 
} from '../services/notificationService.js';
import { ValidationError } from '../utils/errors.js';
import pool from '../db.js';

export const registerDevice = async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    throw new ValidationError('Device token is required');
  }

  await addDeviceToken(userId, token);
  res.status(200).json({ message: 'Device registered successfully' });
};

export const unregisterDevice = async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    throw new ValidationError('Device token is required');
  }

  await removeDeviceToken(userId, token);
  res.status(200).json({ message: 'Device unregistered successfully' });
};

export const sendTestNotification = async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId || !title || !body) {
    throw new ValidationError('User ID, title, and body are required');
  }

  await sendNotification(userId, title, body, data);
  res.status(200).json({ message: 'Notification queued successfully' });
};

export const getNotificationHistory = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await client.query(
      `SELECT id, title, body, data, status, created_at, sent_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await client.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [userId]
    );

    res.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } finally {
    client.release();
  }
};
