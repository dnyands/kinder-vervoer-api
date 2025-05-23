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

// Parent dashboard
router.get('/dashboard',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(getDashboard)
);

// Student attendance history
router.get('/students/:id/attendance',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(getStudentAttendance)
);

// Driver's real-time location
router.get('/drivers/:id/location',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(getDriverLocation)
);

// Subscribe to driver's real-time location updates
router.post('/drivers/:id/subscribe',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(subscribeToDriverLocation)
);

// Schedule change requests
router.post('/schedule-changes',
  authenticateToken,
  requireRole('parent'),
  asyncHandler(requestScheduleChange)
);

export default router;
