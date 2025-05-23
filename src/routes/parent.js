import express from 'express';
import { 
  getDashboard,
  getStudentAttendance,
  getDriverLocation,
  subscribeToDriverLocation,
  requestScheduleChange
} from '../controllers/parentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Parent dashboard
router.get('/dashboard',
  authenticateToken,
  checkRole(['parent']),
  asyncHandler(getDashboard)
);

// Student attendance history
router.get('/students/:id/attendance',
  authenticateToken,
  checkRole(['parent']),
  asyncHandler(getStudentAttendance)
);

// Driver's real-time location
router.get('/drivers/:id/location',
  authenticateToken,
  checkRole(['parent']),
  asyncHandler(getDriverLocation)
);

// Subscribe to driver's real-time location updates
router.post('/drivers/:id/subscribe',
  authenticateToken,
  checkRole(['parent']),
  asyncHandler(subscribeToDriverLocation)
);

// Schedule change requests
router.post('/schedule-changes',
  authenticateToken,
  checkRole(['parent']),
  asyncHandler(requestScheduleChange)
);

export default router;
