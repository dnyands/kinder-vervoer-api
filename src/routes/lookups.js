import express from 'express';
import { validateSchema } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createLookup,
  getAllLookups,
  getLookupById,
  updateLookup,
  deleteLookup
} from '../controllers/lookupController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Lookups
 *   description: Lookup data management endpoints
 */

// Category management (admin only)
router.get('/categories',
  asyncHandler(getCategories)
);

router.post('/categories',
  authenticateToken,
  checkRole(['admin']),
  validateSchema('categorySchema'),
  asyncHandler(createCategory)
);

// Lookup values routes
router.get('/:category',
  asyncHandler(getAllLookups)
);

router.get('/:category/:id',
  asyncHandler(getLookupById)
);

router.post('/:category',
  authenticateToken,
  checkRole(['admin']),
  asyncHandler(createLookup)
);

router.put('/:category/:id',
  authenticateToken,
  checkRole(['admin']),
  asyncHandler(updateLookup)
);

router.delete('/:category/:id',
  authenticateToken,
  checkRole(['admin']),
  asyncHandler(deleteLookup)
);

export default router;
