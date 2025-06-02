import express from 'express';
import { 
  getDashboard,
  getStudentAttendance,
  getDriverLocation,
  subscribeToDriverLocation,
  requestScheduleChange
} from '../controllers/parentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

/**
 * @swagger
 * /api/parent/dashboard:
 *   get:
 *     summary: Get parent dashboard data
 *     tags: [Parents]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Parent dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
// Parent dashboard
router.get('/dashboard',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(getDashboard)
);

/**
 * @swagger
 * /api/parent/students/{id}/attendance:
 *   get:
 *     summary: Get attendance history for a student
 *     tags: [Parents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
// Student attendance history
router.get('/students/:id/attendance',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(getStudentAttendance)
);

/**
 * @swagger
 * /api/parent/drivers/{id}/location:
 *   get:
 *     summary: Get driver's real-time location
 *     tags: [Parents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
// Driver's real-time location
router.get('/drivers/:id/location',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(getDriverLocation)
);

/**
 * @swagger
 * /api/parent/drivers/{id}/subscribe:
 *   post:
 *     summary: Subscribe to driver's real-time location updates
 *     tags: [Parents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Subscription successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
// Subscribe to driver's real-time location updates
router.post('/drivers/:id/subscribe',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(subscribeToDriverLocation)
);

/**
 * @swagger
 * /api/parent/schedule-changes:
 *   post:
 *     summary: Request a schedule change
 *     tags: [Parents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Schedule change requested
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
// Schedule change requests
router.post('/schedule-changes',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(requestScheduleChange)
);

export default router;
