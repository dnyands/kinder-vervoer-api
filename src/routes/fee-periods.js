import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const validateFeePeriod = (feePeriod) => {
  const errors = [];
  if (!feePeriod.name) errors.push('Name is required');
  if (!feePeriod.start_date) errors.push('Start date is required');
  if (!feePeriod.end_date) errors.push('End date is required');
  if (new Date(feePeriod.start_date) > new Date(feePeriod.end_date)) {
    errors.push('Start date must be before end date');
  }
  return errors;
};

// List all fee periods
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const result = await db.query(
      'SELECT * FROM fee_periods ORDER BY start_date DESC'
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching fee periods:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Create fee period
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const errors = validateFeePeriod(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { name, start_date, end_date } = req.body;
    const result = await db.query(
      'INSERT INTO fee_periods (name, start_date, end_date) VALUES ($1, $2, $3) RETURNING *',
      [name, start_date, end_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating fee period:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Update fee period
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const errors = validateFeePeriod(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { name, start_date, end_date } = req.body;
    const result = await db.query(
      'UPDATE fee_periods SET name = $1, start_date = $2, end_date = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, start_date, end_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fee period not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating fee period:', { error });
    res.status(500).json({ error: error.message });
  }
});

// Delete fee period
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const result = await db.query(
      'DELETE FROM fee_periods WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fee period not found' });
    }

    res.json({ message: 'Fee period deleted successfully' });
  } catch (error) {
    logger.error('Error deleting fee period:', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
