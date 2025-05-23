import pool from '../db.js';
import routeMonitoringService from '../services/routeMonitoringService.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { verifySubscription } from '../utils/stripe.js';
import { calculateRoute } from '../utils/maps.js';

export const createDriver = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, surname, email, phone, userId } = req.body;
    
    // Create driver record
    const driverResult = await client.query(
      `INSERT INTO drivers (user_id, name, surname, email, contact_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, name, surname, email, phone]
    );
    
    const driverId = driverResult.rows[0].id;
    
    // Handle profile picture upload if provided
    if (req.files?.profilePicture) {
      const uploadResult = await uploadToCloudinary(req.files.profilePicture[0]);
      await client.query(
        `INSERT INTO file_uploads (filename, original_name, mime_type, size_bytes, path, url, uploaded_by, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [uploadResult.public_id, req.files.profilePicture[0].originalname, 
         req.files.profilePicture[0].mimetype, req.files.profilePicture[0].size,
         uploadResult.secure_url, uploadResult.secure_url, userId, 'driver_profile', driverId]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json({ id: driverId, message: 'Driver profile created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create driver profile' });
  } finally {
    client.release();
  }
};

/**
 * @swagger
 * /api/drivers/location:
 *   patch:
 *     tags: [Drivers]
 *     summary: Update driver's current location
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Location'
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       401:
 *         description: Unauthorized
 */
export const uploadDriverDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { driverId, documentType } = req.body;
    
    if (!req.files?.document) {
      return res.status(400).json({ error: 'No document file provided' });
    }
    
    // Upload document to Cloudinary
    const uploadResult = await uploadToCloudinary(req.files.document[0]);
    
    // Store document reference in database
    const result = await client.query(
      `INSERT INTO driver_documents (driver_id, document_type, file_url, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [driverId, documentType, uploadResult.secure_url]
    );
    
    await client.query('COMMIT');
    res.status(201).json({
      id: result.rows[0].id,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to upload document' });
  } finally {
    client.release();
  }
};

export const updateLocation = async (req, res) => {
  const client = await pool.connect();
  try {
    const { driverId, latitude, longitude, speed, heading } = req.body;
    
    // Update current location
    await client.query(
      `UPDATE drivers 
       SET last_location_lat = $1, 
           last_location_lng = $2,
           last_location_updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [latitude, longitude, driverId]
    );
    
    // Store location history
    await client.query(
      `INSERT INTO driver_locations (driver_id, latitude, longitude, speed, heading)
       VALUES ($1, $2, $3, $4, $5)`,
      [driverId, latitude, longitude, speed, heading]
    );
    
    res.status(200).json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  } finally {
    client.release();
  }
};

/**
 * @swagger
 * /api/drivers/{id}/heatmap:
 *   get:
 *     tags: [Drivers]
 *     summary: Get driver's location heatmap data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Heatmap data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
export const getHeatmap = async (req, res) => {
  const driverId = parseInt(req.params.id);
  const startTime = req.query.startTime ? new Date(req.query.startTime) : null;
  const endTime = req.query.endTime ? new Date(req.query.endTime) : null;

  try {
    const heatmapData = await routeMonitoringService.getHeatmapData(
      driverId,
      startTime,
      endTime
    );
    res.json(heatmapData);
  } catch (error) {
    console.error('Error getting heatmap data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/drivers/profile:
 *   get:
 *     tags: [Drivers]
 *     summary: Get driver's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
export const getProfilerProfile = async (req, res) => {
  const client = await pool.connect();
  try {
    const { driverId } = req.params;
    
    // Get driver profile with documents and subscription status
    const result = await client.query(
      `SELECT d.*, 
              json_agg(DISTINCT ds.*) as schools,
              json_agg(DISTINCT dd.*) as documents,
              json_agg(DISTINCT s.*) as assigned_students,
              EXISTS(
                SELECT 1 FROM driver_subscriptions ds 
                WHERE ds.driver_id = d.id 
                AND ds.status = 'active' 
                AND ds.end_date >= CURRENT_DATE
              ) as has_active_subscription
       FROM drivers d
       LEFT JOIN driver_schools ds ON ds.driver_id = d.id
       LEFT JOIN driver_documents dd ON dd.driver_id = d.id
       LEFT JOIN route_assignments ra ON ra.driver_id = d.id
       LEFT JOIN students s ON s.id = ra.student_id
       WHERE d.id = $1
       GROUP BY d.id`,
      [driverId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver profile' });
  } finally {
    client.release();
  }
};

export const listDrivers = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT d.*, 
              COUNT(DISTINCT s.id) as student_count,
              COUNT(DISTINCT dd.id) FILTER (WHERE dd.verification_status = 'verified') as verified_documents_count,
              EXISTS(
                SELECT 1 FROM driver_subscriptions ds 
                WHERE ds.driver_id = d.id 
                AND ds.status = 'active' 
                AND ds.end_date >= CURRENT_DATE
              ) as has_active_subscription
       FROM drivers d
       LEFT JOIN route_assignments ra ON ra.driver_id = d.id
       LEFT JOIN students s ON s.id = ra.student_id
       LEFT JOIN driver_documents dd ON dd.driver_id = d.id
       GROUP BY d.id
       ORDER BY d.created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drivers list' });
  } finally {
    client.release();
  }
};

export const verifyDriverDocuments = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { driverId, documentId, status } = req.body;
    
    // Update document verification status
    await client.query(
      `UPDATE driver_documents 
       SET verification_status = $1,
           verified_by = $2,
           verified_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND driver_id = $4`,
      [status, req.user.id, documentId, driverId]
    );
    
    // Check if all required documents are verified
    const docsResult = await client.query(
      `SELECT COUNT(*) = (
         SELECT COUNT(*) 
         FROM driver_documents 
         WHERE driver_id = $1 
         AND verification_status = 'verified'
       ) as all_verified
       FROM driver_documents 
       WHERE driver_id = $1`,
      [driverId]
    );
    
    if (docsResult.rows[0].all_verified) {
      await client.query(
        `UPDATE drivers 
         SET is_verified = true 
         WHERE id = $1`,
        [driverId]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Document verification status updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update document verification' });
  } finally {
    client.release();
  }
};

export const updateDriverSubscription = async (req, res) => {
  const client = await pool.connect();
  try {
    const { driverId, subscriptionId } = req.body;
    
    // Verify subscription with Stripe
    const subscription = await verifySubscription(subscriptionId);
    if (!subscription.active) {
      return res.status(400).json({ error: 'Invalid or inactive subscription' });
    }
    
    await client.query('BEGIN');
    
    // Update driver subscription status
    await client.query(
      `INSERT INTO driver_subscriptions (
         driver_id, subscription_type, amount, start_date, end_date, status
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [driverId, subscription.type, subscription.amount, 
       subscription.startDate, subscription.endDate, 'active']
    );
    
    // Update driver active status
    await client.query(
      `UPDATE drivers 
       SET is_active = true,
           subscription_status = 'active'
       WHERE id = $1`,
      [driverId]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update subscription' });
  } finally {
    client.release();
  }
};

export const assignStudentsToDriver = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { driverId, studentIds, routeId } = req.body;
    
    // Check if driver is active and verified
    const result = await client.query(
      `SELECT d.*, u.first_name, u.last_name, u.email, u.phone,
              COALESCE(dar.average_rating, 0) as average_rating,
              COALESCE(dar.total_ratings, 0) as total_ratings
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN driver_average_ratings dar ON dar.driver_id = d.id
       WHERE d.id = $1`,
      [driverId]
    );
    
    if (!result.rows[0]?.is_verified || !result.rows[0]?.is_active) {
      throw new Error('Driver must be verified and active');
    }
    
    // Calculate optimal route
    const students = await client.query(
      `SELECT id, pickup_address, dropoff_address 
       FROM students 
       WHERE id = ANY($1)`,
      [studentIds]
    );
    
    const route = await calculateRoute(students.rows);
    
    // Create or update route assignments
    for (let i = 0; i < route.length; i++) {
      await client.query(
        `INSERT INTO route_assignments (route_id, driver_id, student_id, pickup_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (route_id, student_id)
         DO UPDATE SET driver_id = $2, pickup_order = $4`,
        [routeId, driverId, route[i].studentId, i + 1]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Students assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};
