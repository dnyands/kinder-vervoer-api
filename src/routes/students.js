import express from "express";
import db from "../db.js";
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all students
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.*,
        json_agg(DISTINCT jsonb_build_object(
          'route_id', ra.route_id,
          'pickup_order', ra.pickup_order
        )) as route_assignments
      FROM students s
      LEFT JOIN route_assignments ra ON s.id = ra.student_id
      GROUP BY s.id
      ORDER BY s.full_name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.*,
        json_agg(DISTINCT jsonb_build_object(
          'route_id', ra.route_id,
          'pickup_order', ra.pickup_order,
          'route_name', pr.name,
          'schedule_time', pr.schedule_time
        )) as route_assignments
      FROM students s
      LEFT JOIN route_assignments ra ON s.id = ra.student_id
      LEFT JOIN pickup_routes pr ON ra.route_id = pr.id
      WHERE s.id = $1
      GROUP BY s.id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new student
router.post("/", authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { 
      full_name, 
      grade, 
      guardian_name, 
      guardian_phone, 
      pickup_address, 
      dropoff_address 
    } = req.body;

    const result = await db.query(
      `INSERT INTO students (
        full_name, 
        grade, 
        guardian_name, 
        guardian_phone, 
        pickup_address, 
        dropoff_address
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [full_name, grade, guardian_name, guardian_phone, pickup_address, dropoff_address]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update student
router.put("/:id", authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { 
      full_name, 
      grade, 
      guardian_name, 
      guardian_phone, 
      pickup_address, 
      dropoff_address,
      status 
    } = req.body;

    const result = await db.query(
      `UPDATE students 
       SET full_name = $1, 
           grade = $2, 
           guardian_name = $3, 
           guardian_phone = $4, 
           pickup_address = $5, 
           dropoff_address = $6,
           status = $7
       WHERE id = $8 
       RETURNING *`,
      [full_name, grade, guardian_name, guardian_phone, pickup_address, dropoff_address, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete student
router.delete("/:id", authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Delete route assignments first
    await client.query('DELETE FROM route_assignments WHERE student_id = $1', [req.params.id]);
    
    // Then delete student
    const result = await client.query('DELETE FROM students WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Student not found' });
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
