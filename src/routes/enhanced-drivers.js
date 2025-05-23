import express from 'express';
import multer from 'multer';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import {
  createDriver,
  uploadDriverDocument,
  updateDriverLocation,
  getDriverProfile,
  listDrivers,
  verifyDriverDocuments,
  updateDriverSubscription,
  assignStudentsToDriver
} from '../controllers/driverController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Driver profile routes
router.post('/', authenticateToken, upload.fields([
  { name: 'profilePicture', maxCount: 1 }
]), createDriver);

router.get('/', authenticateToken, listDrivers);
router.get('/:driverId', authenticateToken, getDriverProfile);

// Document management routes
router.post('/documents', authenticateToken, upload.fields([
  { name: 'document', maxCount: 1 }
]), uploadDriverDocument);

router.post('/documents/verify', authenticateToken, authorizeRole(['admin']), verifyDriverDocuments);

// Subscription management
router.post('/subscription', authenticateToken, updateDriverSubscription);

// Location tracking
router.post('/location', authenticateToken, updateDriverLocation);

// Student assignment
router.post('/assign-students', authenticateToken, assignStudentsToDriver);

export default router;
