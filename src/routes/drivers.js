import express from "express";
import db from "../db.js";
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all drivers
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.*,
        json_agg(DISTINCT jsonb_build_object(
          'route_id', ra.route_id,
          'route_name', pr.name,
          'schedule_time', pr.schedule_time
        )) as assigned_routes
      FROM drivers d
      LEFT JOIN route_assignments ra ON d.id = ra.driver_id
      LEFT JOIN pickup_routes pr ON ra.route_id = pr.id
      GROUP BY d.id
      ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get driver by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.*,
        json_agg(DISTINCT jsonb_build_object(
          'route_id', ra.route_id,
          'route_name', pr.name,
          'schedule_time', pr.schedule_time,
          'student_count', (
            SELECT COUNT(*) 
            FROM route_assignments 
            WHERE route_id = pr.id
          )
        )) as assigned_routes
      FROM drivers d
      LEFT JOIN route_assignments ra ON d.id = ra.driver_id
      LEFT JOIN pickup_routes pr ON ra.route_id = pr.id
      WHERE d.id = $1
      GROUP BY d.id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new driver
router.post("/", authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, license_number, phone_number } = req.body;

    const result = await db.query(
      `INSERT INTO drivers (name, license_number, phone_number) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, license_number, phone_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.constraint === 'drivers_license_number_key') {
      return res.status(400).json({ error: 'License number already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update driver
router.put("/:id", authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, license_number, phone_number, status } = req.body;

    const result = await db.query(
      `UPDATE drivers 
       SET name = $1, 
           license_number = $2, 
           phone_number = $3,
           status = $4
       WHERE id = $5 
       RETURNING *`,
      [name, license_number, phone_number, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    if (error.constraint === 'drivers_license_number_key') {
      return res.status(400).json({ error: 'License number already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get driver's current route
router.get("/:id/current-route", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        pr.*,
        json_agg(
          json_build_object(
            'student_id', s.id,
            'student_name', s.full_name,
            'pickup_address', s.pickup_address,
            'pickup_order', ra.pickup_order
          ) ORDER BY ra.pickup_order
        ) as students
      FROM pickup_routes pr
      JOIN route_assignments ra ON pr.id = ra.route_id
      JOIN students s ON ra.student_id = s.id
      WHERE ra.driver_id = $1
        AND pr.status = 'active'
        AND NOW()::TIME BETWEEN 
          (pr.schedule_time - interval '1 hour') 
          AND 
          (pr.schedule_time + interval '2 hours')
      GROUP BY pr.id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.json(null);
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete driver
router.delete("/:id", authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Delete route assignments first
    await client.query('DELETE FROM route_assignments WHERE driver_id = $1', [req.params.id]);
    
    // Then delete driver
    const result = await client.query('DELETE FROM drivers WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
