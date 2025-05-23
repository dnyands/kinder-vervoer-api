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

router.get('/driver-count-by-province',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getDriverCountByProvince)
);

router.get('/student-count-by-town',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getStudentCountByTown)
);

router.get('/average-trip-duration',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getAverageTripDuration)
);

router.get('/ontime-percentage',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getOntimePercentage)
);

export default router;
