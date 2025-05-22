import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const validateAccount = (account) => {
  const errors = [];
  if (!account.user_id) errors.push('User ID is required');
  if (!account.fee_period_id) errors.push('Fee period ID is required');
  if (!account.amount_charged || account.amount_charged <= 0) {
    errors.push('Valid amount charged is required');
  }
  if (!account.payment_due_date) errors.push('Payment due date is required');
  return errors;
};

// List all accounts
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const result = await db.query(
      `SELECT a.*, u.full_name as user_name, fp.name as fee_period_name 
       FROM accounts a 
       JOIN users u ON a.user_id = u.id 
       JOIN fee_periods fp ON a.fee_period_id = fp.id 
       ORDER BY a.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching driver accounts:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Create account
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const errors = validateAccount(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { user_id, fee_period_id, amount_charged, payment_due_date, notes } = req.body;
    const result = await db.query(
      `INSERT INTO accounts 
       (user_id, fee_period_id, amount_charged, payment_due_date, notes) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [user_id, fee_period_id, amount_charged, payment_due_date, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating driver account:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Update account
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { amount_paid, payment_status, notes } = req.body;
    const result = await db.query(
      `UPDATE accounts 
       SET amount_paid = $1, 
           payment_status = $2, 
           notes = $3, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [amount_paid, payment_status, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating driver account:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Get account by user ID
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // If not admin, check if user is requesting their own account
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT a.*, fp.name as fee_period_name, fp.start_date, fp.end_date
       FROM accounts a
       JOIN fee_periods fp ON a.fee_period_id = fp.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching driver account:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Delete account
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const result = await db.query(
      'DELETE FROM accounts WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver account not found' });
    }

    res.json({ message: 'Driver account deleted successfully' });
  } catch (error) {
    logger.error('Error deleting driver account:', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
