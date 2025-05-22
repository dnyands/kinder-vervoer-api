import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// List all accounts (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    logger.info('Accounts list request', {
      userId: req.user?.id,
      userRole: req.user?.role,
      headers: req.headers
    });

    // Check if user exists
    if (!req.user) {
      logger.error('User object missing in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      logger.warn('Non-admin access attempt', {
        userId: req.user.id,
        userRole: req.user.role
      });
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // First, let's check the table structure
    logger.info('Checking users table structure');
    const tableInfo = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    
    logger.info('Users table structure:', {
      columns: tableInfo.rows
    });

    logger.info('Executing database query for accounts list');
    const result = await db.query(
      'SELECT id, email, role, COALESCE(full_name, \'Not Set\') as full_name, COALESCE(phone_number, \'Not Set\') as phone_number, profile_picture_url, is_verified, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    logger.info('Successfully retrieved accounts', {
      count: result.rows.length
    });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error in accounts list endpoint', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      query: req.query
    });
    res.status(500).json({ error: error.message });
  }
});

export default router;
