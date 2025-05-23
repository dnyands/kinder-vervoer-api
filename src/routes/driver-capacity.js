import express from 'express';
import { getDriverCapacity } from '../controllers/driverCapacityController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id/capacity', authenticateToken, getDriverCapacity);

export default router;
