import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const validateSubscription = (subscription) => {
  const errors = [];
  if (!subscription.driver_id) errors.push('Driver ID is required');
  if (!subscription.subscription_type) errors.push('Subscription type is required');
  if (!subscription.amount || subscription.amount <= 0) {
    errors.push('Valid amount is required');
  }
  if (!subscription.start_date) errors.push('Start date is required');
  if (!subscription.end_date) errors.push('End date is required');
  if (new Date(subscription.start_date) > new Date(subscription.end_date)) {
    errors.push('Start date must be before end date');
  }
  return errors;
};

// List all subscriptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const result = await db.query(
      `SELECT ds.*, d.name as driver_name, d.subscription_status 
       FROM driver_subscriptions ds 
       JOIN drivers d ON ds.driver_id = d.id 
       ORDER BY ds.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching subscriptions:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Create subscription
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const errors = validateSubscription(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { driver_id, subscription_type, amount, start_date, end_date } = req.body;

    // Start a transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Create subscription
      const subscriptionResult = await client.query(
        `INSERT INTO driver_subscriptions 
         (driver_id, subscription_type, amount, start_date, end_date) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [driver_id, subscription_type, amount, start_date, end_date]
      );

      // Update driver's subscription status
      await client.query(
        `UPDATE drivers 
         SET subscription_status = 'active' 
         WHERE id = $1`,
        [driver_id]
      );

      await client.query('COMMIT');
      res.status(201).json(subscriptionResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error creating subscription:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Check subscription status
router.get('/check-status/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const currentDate = new Date().toISOString().split('T')[0];

    // Get latest subscription
    const result = await db.query(
      `SELECT ds.*, d.subscription_status, d.name as driver_name
       FROM driver_subscriptions ds
       JOIN drivers d ON ds.driver_id = d.id
       WHERE ds.driver_id = $1
       AND ds.status = 'active'
       ORDER BY ds.end_date DESC
       LIMIT 1`,
      [driverId]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: 'inactive',
        message: 'No active subscription found'
      });
    }

    const subscription = result.rows[0];
    const isExpired = new Date(subscription.end_date) < new Date(currentDate);
    const daysUntilExpiry = Math.ceil(
      (new Date(subscription.end_date) - new Date(currentDate)) / (1000 * 60 * 60 * 24)
    );

    // Update subscription status if expired
    if (isExpired && subscription.subscription_status !== 'expired') {
      await db.query(
        `UPDATE drivers 
         SET subscription_status = 'expired' 
         WHERE id = $1`,
        [driverId]
      );

      await db.query(
        `UPDATE driver_subscriptions 
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [subscription.id]
      );

      return res.json({
        status: 'expired',
        message: 'Subscription has expired',
        subscription: {
          ...subscription,
          status: 'expired',
          subscription_status: 'expired'
        }
      });
    }

    // Return active status with days until expiry
    return res.json({
      status: 'active',
      daysUntilExpiry,
      message: daysUntilExpiry <= 7 
        ? `Subscription will expire in ${daysUntilExpiry} days`
        : 'Subscription is active',
      subscription
    });

  } catch (error) {
    logger.error('Error checking subscription status:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Update subscription
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { end_date, status } = req.body;
    const result = await db.query(
      `UPDATE driver_subscriptions 
       SET end_date = COALESCE($1, end_date),
           status = COALESCE($2, status),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [end_date, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating subscription:', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
