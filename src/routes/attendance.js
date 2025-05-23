import express from 'express';
import { 
  markAttendance, 
  getStudentAttendance,
  getDailyAttendanceSummary
} from '../controllers/attendanceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkRole } from '../middleware/roles.js';

const router = express.Router();

// Mark attendance (driver only)
router.post('/', 
  authenticateToken,
  checkRole(['driver']),
  asyncHandler(markAttendance)
);

// Get student attendance history (parent, driver, or admin)
router.get('/students/:id',
  authenticateToken,
  checkRole(['parent', 'driver', 'admin']),
  asyncHandler(getStudentAttendance)
);

// Get daily attendance summary (admin only)
router.get('/daily-summary',
  authenticateToken,
  checkRole(['admin']),
  asyncHandler(getDailyAttendanceSummary)
);

export default router;
