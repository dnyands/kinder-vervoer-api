import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  getDriverCountByProvince,
  getStudentCountByTown,
  getAverageTripDuration,
  getOntimePercentage
} from '../controllers/analyticsController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics endpoints
 */

/**
 * @swagger
 * /api/analytics/driver-count-by-province:
 *   get:
 *     summary: Get driver count by province
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Driver count by province
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/driver-count-by-province',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getDriverCountByProvince)
);

/**
 * @swagger
 * /api/analytics/student-count-by-town:
 *   get:
 *     summary: Get student count by town
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Student count by town
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/student-count-by-town',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getStudentCountByTown)
);

/**
 * @swagger
 * /api/analytics/average-trip-duration:
 *   get:
 *     summary: Get average trip duration
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Average trip duration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/average-trip-duration',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getAverageTripDuration)
);

/**
 * @swagger
 * /api/analytics/ontime-percentage:
 *   get:
 *     summary: Get on-time trip percentage
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: On-time trip percentage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/ontime-percentage',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getOntimePercentage)
);

export default router;
