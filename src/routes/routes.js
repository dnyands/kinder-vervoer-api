import express from 'express';
import { 
  generateOptimizedRoute,
  getRoute,
  getRouteHistory
} from '../controllers/routeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Generate optimized route
router.post('/optimize',
  authenticateToken,
  checkRole(['admin', 'driver']),
  asyncHandler(generateOptimizedRoute)
);

// Get current route for driver and school
router.get('/:driverId/:schoolId',
  authenticateToken,
  checkRole(['admin', 'driver']),
  asyncHandler(getRoute)
);

// Get route history for driver
router.get('/:driverId/history',
  authenticateToken,
  checkRole(['admin', 'driver']),
  asyncHandler(getRouteHistory)
);

export default router;
