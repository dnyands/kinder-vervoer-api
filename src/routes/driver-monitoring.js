import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getHeatmap, updateLocation } from '../controllers/driverController.js';
import { i18n } from '../utils/i18n.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Driver Monitoring
 *   description: Driver location tracking and monitoring endpoints
 */

/**
 * @swagger
 * /api/monitoring/drivers/{id}/heatmap:
 *   get:
 *     tags: [Driver Monitoring]
 *     summary: Get driver's location heatmap data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Heatmap data retrieved successfully
 */
router.get('/drivers/:id/heatmap',
  authenticateToken,
  checkRole(['admin', 'driver']),
  asyncHandler(getHeatmap)
);

/**
 * @swagger
 * /api/monitoring/drivers/location:
 *   patch:
 *     tags: [Driver Monitoring]
 *     summary: Update driver's current location
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               speed:
 *                 type: number
 *               heading:
 *                 type: number
 *               accuracy:
 *                 type: number
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.patch('/drivers/location',
  authenticateToken,
  checkRole(['driver']),
  i18n.middleware(),
  asyncHandler(updateLocation)
);

export default router;
