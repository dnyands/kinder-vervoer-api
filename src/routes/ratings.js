import express from 'express';
import { createRating, getDriverRatings } from '../controllers/ratingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Create a new rating
router.post('/', authenticateToken, asyncHandler(createRating));

// Get ratings for a driver
router.get('/drivers/:id', authenticateToken, asyncHandler(getDriverRatings));

export default router;
