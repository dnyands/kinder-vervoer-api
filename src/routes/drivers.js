import express from "express";
import multer from 'multer';
import db from "../db.js";
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import {
  createDriver as createDriverProfile,
  uploadDriverDocument,
  updateDriverLocation,
  verifyDriverDocuments,
  updateDriverSubscription,
  assignStudentsToDriver,
  getHeatmap
} from '../controllers/driverController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

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
// Helper function to check for existing driver details
const checkExistingDriver = async (contact_number, license_number, excludeId = null) => {
  let query = `
    SELECT id, contact_number, license_number 
    FROM drivers 
    WHERE contact_number = $1 OR license_number = $2
  `;
  const values = [contact_number, license_number];
  
  if (excludeId) {
    query += ` AND id != $3`;
    values.push(excludeId);
  }
  
  const result = await db.query(query, values);
  const existing = result.rows[0];
  
  if (existing) {
    const errors = [];
    if (existing.contact_number === contact_number) errors.push('Contact number already registered');
    if (existing.license_number === license_number) errors.push('License number already registered');
    return errors;
  }
  return null;
};

router.post("/", authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { 
      name,
      contact_number,
      license_number,
      vehicle_type,
      vehicle_registration,
      status
    } = req.body;

    // Check for existing driver details
    const existingErrors = await checkExistingDriver(contact_number, license_number);
    if (existingErrors) {
      return res.status(400).json({ errors: existingErrors });
    }

    const result = await db.query(
      `INSERT INTO drivers (
        name,
        contact_number,
        license_number,
        vehicle_type,
        vehicle_registration,
        status
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [name, contact_number, license_number, vehicle_type, vehicle_registration, status]
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
    const { 
      name,
      contact_number,
      license_number,
      vehicle_type,
      vehicle_registration,
      status 
    } = req.body;

    // Check for existing driver details, excluding current driver
    const existingErrors = await checkExistingDriver(contact_number, license_number, req.params.id);
    if (existingErrors) {
      return res.status(400).json({ errors: existingErrors });
    }

    const result = await db.query(
      `UPDATE drivers 
       SET name = $1, 
           contact_number = $2, 
           license_number = $3, 
           vehicle_type = $4,
           vehicle_registration = $5,
           status = $6
       WHERE id = $7 
       RETURNING *`,
      [name, contact_number, license_number, vehicle_type, vehicle_registration, status, req.params.id]
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

// Document management routes
router.post('/documents', authenticateToken, upload.fields([
  { name: 'document', maxCount: 1 }
]), uploadDriverDocument);

router.post('/documents/verify', authenticateToken, authorizeRole(['admin']), verifyDriverDocuments);

// Subscription management
router.post('/subscription', authenticateToken, updateDriverSubscription);

// Location tracking
router.post('/location', authenticateToken, updateDriverLocation);

// Student assignment
router.post('/assign-students', authenticateToken, assignStudentsToDriver);

export default router;
