import { 
  optimizeRoute, 
  getDriverRoute,
  shouldRegenerateRoute 
} from '../services/routeOptimizationService.js';
import { ValidationError } from '../utils/errors.js';
import pool from '../db.js';

export const generateOptimizedRoute = async (req, res) => {
  const { driverId, schoolId, studentIds } = req.body;

  if (!driverId || !schoolId || !studentIds || !studentIds.length) {
    throw new ValidationError('Driver ID, school ID, and student IDs are required');
  }

  // Check if driver exists and is active
  const client = await pool.connect();
  try {
    const driverResult = await client.query(
      'SELECT id FROM drivers WHERE id = $1 AND is_active = true',
      [driverId]
    );

    if (!driverResult.rows.length) {
      throw new ValidationError('Invalid or inactive driver');
    }

    // Check if all students exist and are assigned to the driver
    const studentResult = await client.query(
      `SELECT id FROM students 
       WHERE id = ANY($1::int[])
       AND driver_id = $2`,
      [studentIds, driverId]
    );

    if (studentResult.rows.length !== studentIds.length) {
      throw new ValidationError('One or more students are not assigned to this driver');
    }

    const route = await optimizeRoute(driverId, schoolId, studentIds);
    res.json(route);
  } finally {
    client.release();
  }
};

export const getRoute = async (req, res) => {
  const { driverId, schoolId } = req.params;
  
  const route = await getDriverRoute(driverId, schoolId);
  
  if (!route) {
    throw new ValidationError('No active route found for this driver and school');
  }

  // Check if route needs regeneration
  const needsRegeneration = await shouldRegenerateRoute(route.id);
  
  if (needsRegeneration) {
    const newRoute = await optimizeRoute(
      driverId, 
      schoolId, 
      route.student_ids
    );
    res.json(newRoute);
  } else {
    res.json(route);
  }
};

export const getRouteHistory = async (req, res) => {
  const { driverId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT r.*, 
              s.name as school_name,
              h.change_type,
              h.created_at as change_date
       FROM driver_routes r
       JOIN schools s ON s.id = r.school_id
       JOIN route_history h ON h.route_id = r.id
       WHERE r.driver_id = $1
       ORDER BY h.created_at DESC
       LIMIT $2 OFFSET $3`,
      [driverId, limit, offset]
    );

    const countResult = await client.query(
      `SELECT COUNT(*) 
       FROM driver_routes r
       JOIN route_history h ON h.route_id = r.id
       WHERE r.driver_id = $1`,
      [driverId]
    );

    res.json({
      routes: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } finally {
    client.release();
  }
};
