import express from 'express';
import db from '../db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all pickup routes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        pr.*,
        json_agg(json_build_object(
          'id', ra.id,
          'student_id', ra.student_id,
          'driver_id', ra.driver_id,
          'pickup_order', ra.pickup_order
        )) as assignments
      FROM pickup_routes pr
      LEFT JOIN route_assignments ra ON pr.id = ra.route_id
      GROUP BY pr.id
      ORDER BY pr.schedule_time
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single pickup route by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        pr.*,
        json_agg(
          CASE WHEN ra.id IS NOT NULL THEN
            json_build_object(
              'id', ra.id,
              'student_id', ra.student_id,
              'driver_id', ra.driver_id,
              'pickup_order', ra.pickup_order,
              'student', (
                SELECT json_build_object(
                  'id', s.id,
                  'full_name', CONCAT(s.first_name, ' ', s.last_name) as full_name,
                  'grade', s.grade,
                  'pickup_address', s.pickup_address
                )
                FROM students s
                WHERE s.id = ra.student_id
              )
            )
          ELSE NULL
          END
        ) FILTER (WHERE ra.id IS NOT NULL) as assignments
      FROM pickup_routes pr
      LEFT JOIN route_assignments ra ON pr.id = ra.route_id
      WHERE pr.id = $1
      GROUP BY pr.id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new pickup route
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, description, schedule_time } = req.body;
    const result = await db.query(
      'INSERT INTO pickup_routes (name, description, schedule_time) VALUES ($1, $2, $3) RETURNING *',
      [name, description, schedule_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update pickup route
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, description, schedule_time, status } = req.body;
    const result = await db.query(
      'UPDATE pickup_routes SET name = $1, description = $2, schedule_time = $3, status = $4 WHERE id = $5 RETURNING *',
      [name, description, schedule_time, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign students and driver to route
router.post('/:id/assignments', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { driver_id, student_assignments } = req.body;
    const route_id = req.params.id;

    // Delete existing assignments for this route
    await client.query('DELETE FROM route_assignments WHERE route_id = $1', [route_id]);

    // Create new assignments
    for (const assignment of student_assignments) {
      await client.query(
        'INSERT INTO route_assignments (route_id, driver_id, student_id, pickup_order) VALUES ($1, $2, $3, $4)',
        [route_id, driver_id, assignment.student_id, assignment.pickup_order]
      );
    }

    await client.query('COMMIT');
    
    const result = await client.query(
      'SELECT * FROM route_assignments WHERE route_id = $1 ORDER BY pickup_order',
      [route_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Delete pickup route
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Delete all assignments first
    await client.query('DELETE FROM route_assignments WHERE route_id = $1', [req.params.id]);
    
    // Then delete the route
    const result = await client.query(
      'DELETE FROM pickup_routes WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Route not found' });
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
