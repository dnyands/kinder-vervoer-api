import { db } from '../db/index.js';
import errors from '../utils/errors.js';
import asyncHandler from '../utils/asyncHandler.js';

const { NotFoundError } = errors;

/**
 * @swagger
 * /api/drivers/{id}/capacity:
 *   get:
 *     summary: Get driver's vehicle capacity and availability
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver capacity information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 driverId:
 *                   type: integer
 *                 vehicleCapacity:
 *                   type: integer
 *                 assignedStudents:
 *                   type: integer
 *                 availableSlots:
 *                   type: integer
 *       404:
 *         description: Driver not found
 */
export const getDriverCapacity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT 
      d.id as driver_id,
      d.vehicle_capacity,
      COUNT(s.id) as assigned_students
    FROM drivers d
    LEFT JOIN students s ON s.driver_id = d.id AND s.status = 'active'
    WHERE d.id = $1
    GROUP BY d.id, d.vehicle_capacity`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Driver not found');
  }

  const { driver_id, vehicle_capacity, assigned_students } = result.rows[0];
  const availableSlots = vehicle_capacity - assigned_students;

  res.json({
    driverId: driver_id,
    vehicleCapacity: vehicle_capacity,
    assignedStudents: assigned_students,
    availableSlots
  });
});

/**
 * Check if a driver has available capacity
 * @param {number} driverId - The ID of the driver
 * @returns {Promise<boolean>} - True if driver has available capacity
 */
export const checkDriverCapacity = async (driverId) => {
  const result = await db.query(
    `SELECT 
      d.vehicle_capacity,
      COUNT(s.id) as assigned_students
    FROM drivers d
    LEFT JOIN students s ON s.driver_id = d.id AND s.status = 'active'
    WHERE d.id = $1
    GROUP BY d.vehicle_capacity`,
    [driverId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Driver not found');
  }

  const { vehicle_capacity, assigned_students } = result.rows[0];
  return assigned_students < vehicle_capacity;
};
