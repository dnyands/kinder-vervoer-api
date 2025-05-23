import express from 'express';
import { 
  registerDevice,
  unregisterDevice,
  sendTestNotification,
  getNotificationHistory
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Device registration
router.post('/register-device', 
  authenticateToken,
  asyncHandler(registerDevice)
);

router.post('/unregister-device',
  authenticateToken,
  asyncHandler(unregisterDevice)
);

// Test notification (admin only)
router.post('/send',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(sendTestNotification)
);

// Get notification history
router.get('/history',
  authenticateToken,
  asyncHandler(getNotificationHistory)
);

export default router;
