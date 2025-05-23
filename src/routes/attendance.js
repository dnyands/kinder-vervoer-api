import express from 'express';
import { 
  markAttendance, 
  getStudentAttendance,
  getDailyAttendanceSummary
} from '../controllers/attendanceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

// Mark attendance (driver only)
router.post('/', 
  authenticateToken,
  requireRole('driver'),
  asyncHandler(markAttendance)
);

// Get student attendance history (parent, driver, or admin)
router.get('/students/:id',
  authenticateToken,
  requireRole('parent', 'driver', 'admin'),
  asyncHandler(getStudentAttendance)
);

// Get daily attendance summary (admin only)
router.get('/daily-summary',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(getDailyAttendanceSummary)
);

export default router;
