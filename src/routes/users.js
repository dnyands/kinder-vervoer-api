import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// List all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    logger.info('Users list request', {
      userId: req.user?.id,
      userRole: req.user?.role
    });

    if (!req.user) {
      logger.error('User object missing in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      logger.warn('Non-admin access attempt', {
        userId: req.user.id,
        userRole: req.user.role
      });
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const result = await db.query(
      'SELECT id, email, role, CONCAT(first_name, \' \', last_name) as full_name, COALESCE(phone_number, \'Not Set\') as phone_number, profile_picture_url, is_verified, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    logger.info('Successfully retrieved users', {
      count: result.rows.length
    });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error in users list endpoint', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

export default router;
