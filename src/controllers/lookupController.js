import dynamicLookupService from '../services/dynamicLookupService.js';

/**
 * @swagger
 * /api/lookups/{type}:
 *   post:
 *     tags: [Lookups]
 *     summary: Create a new lookup item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [provinces, towns, schoolTypes, vehicleTypes, documentTypes, notificationTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lookup item created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
/**
 * @swagger
 * /api/lookups/categories:
 *   get:
 *     tags: [Lookups]
 *     summary: Get all lookup categories
 *     responses:
 *       200:
 *         description: List of lookup categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await dynamicLookupService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/lookups/categories:
 *   post:
 *     tags: [Lookups]
 *     summary: Create a new lookup category
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, schema]
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               has_parent:
 *                 type: boolean
 *               parent_category_id:
 *                 type: integer
 *               schema:
 *                 type: object
 *     responses:
 *       201:
 *         description: Category created successfully
 */
export const createCategory = async (req, res) => {
  try {
    const category = await dynamicLookupService.createCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.message.includes('Invalid')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

/**
 * @swagger
 * /api/lookups/{category}:
 *   post:
 *     tags: [Lookups]
 *     summary: Create a new lookup value
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Value created successfully
 */
export const createLookup = async (req, res) => {
  try {
    const { type } = req.params;
    const result = await lookupService.create(type, req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error(`Error creating ${req.params.type}:`, error);
    if (error.message.includes('Invalid')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

/**
 * @swagger
 * /api/lookups/{type}:
 *   get:
 *     tags: [Lookups]
 *     summary: Get all lookup items of a type
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [provinces, towns, schoolTypes, vehicleTypes, documentTypes, notificationTypes]
 *     responses:
 *       200:
 *         description: List of lookup items
 *       400:
 *         description: Invalid type
 */
/**
 * @swagger
 * /api/lookups/{category}:
 *   get:
 *     tags: [Lookups]
 *     summary: Get lookup values
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of lookup values
 */
export const getAllLookups = async (req, res) => {
  try {
    const { type } = req.params;
    const { orderBy, order, ...filters } = req.query;
    const result = await lookupService.getAll(type, {
      orderBy,
      order,
      filters
    });
    res.json(result);
  } catch (error) {
    console.error(`Error getting ${req.params.type}:`, error);
    if (error.message.includes('Invalid')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

/**
 * @swagger
 * /api/lookups/{type}/{id}:
 *   get:
 *     tags: [Lookups]
 *     summary: Get a lookup item by ID
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [provinces, towns, schoolTypes, vehicleTypes, documentTypes, notificationTypes]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lookup item found
 *       404:
 *         description: Item not found
 */
/**
 * @swagger
 * /api/lookups/{category}/{id}:
 *   get:
 *     tags: [Lookups]
 *     summary: Get a lookup value by ID
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lookup value found
 */
export const getLookupById = async (req, res) => {
  try {
    const { type, id } = req.params;
    const result = await lookupService.getById(type, id);
    if (!result) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(result);
  } catch (error) {
    console.error(`Error getting ${req.params.type}:`, error);
    if (error.message.includes('Invalid')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

/**
 * @swagger
 * /api/lookups/{type}/{id}:
 *   put:
 *     tags: [Lookups]
 *     summary: Update a lookup item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [provinces, towns, schoolTypes, vehicleTypes, documentTypes, notificationTypes]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       404:
 *         description: Item not found
 *       403:
 *         description: Forbidden - Admin only
 */
/**
 * @swagger
 * /api/lookups/{category}/{id}:
 *   put:
 *     tags: [Lookups]
 *     summary: Update a lookup value
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Value updated successfully
 */
export const updateLookup = async (req, res) => {
  try {
    const { type, id } = req.params;
    const result = await lookupService.update(type, id, req.body);
    if (!result) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(result);
  } catch (error) {
    console.error(`Error updating ${req.params.type}:`, error);
    if (error.message.includes('Invalid')) {
      res.status(400).json({ message: error.message });
    } else if (error.message.includes('not found')) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

/**
 * @swagger
 * /api/lookups/{type}/{id}:
 *   delete:
 *     tags: [Lookups]
 *     summary: Delete a lookup item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [provinces, towns, schoolTypes, vehicleTypes, documentTypes, notificationTypes]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       404:
 *         description: Item not found
 *       403:
 *         description: Forbidden - Admin only
 *       400:
 *         description: Cannot delete - item in use
 */
/**
 * @swagger
 * /api/lookups/{category}/{id}:
 *   delete:
 *     tags: [Lookups]
 *     summary: Delete a lookup value
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Value deleted successfully
 */
export const deleteLookup = async (req, res) => {
  try {
    const { type, id } = req.params;
    const result = await lookupService.delete(type, id);
    if (!result) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(result);
  } catch (error) {
    console.error(`Error deleting ${req.params.type}:`, error);
    if (error.message.includes('in use')) {
      res.status(400).json({ message: error.message });
    } else if (error.message.includes('not found')) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};
