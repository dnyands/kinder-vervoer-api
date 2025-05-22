import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.params.uploadType;
    const folder = uploadType === 'vehicle-images' ? 'uploads/vehicles' : 'uploads/documents';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG and PNG allowed.'));
    }
  }
});

// Upload file
// Upload driver documents or vehicle images
router.post('/drivers/:driverId/:uploadType', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const { driverId, uploadType } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!['documents', 'vehicle-images'].includes(uploadType)) {
      return res.status(400).json({ error: 'Invalid upload type' });
    }

    // Validate driver exists
    const driver = await db.query('SELECT id FROM drivers WHERE id = $1', [driverId]);
    if (driver.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const uploadResults = [];
    for (const file of files) {
      const fileUrl = `/${uploadType === 'vehicle-images' ? 'uploads/vehicles' : 'uploads/documents'}/${file.filename}`;
      
      // Insert into appropriate table based on upload type
      if (uploadType === 'vehicle-images') {
        const result = await db.query(
          `INSERT INTO driver_vehicle_images (
            driver_id,
            image_type,
            file_name,
            file_path,
            mime_type,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [driverId, 'vehicle', file.filename, fileUrl, file.mimetype, 'pending']
        );
        uploadResults.push(result.rows[0]);
      } else {
        const result = await db.query(
          `INSERT INTO driver_documents (
            driver_id,
            document_type,
            file_name,
            file_path,
            mime_type,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [driverId, 'license', file.filename, fileUrl, file.mimetype, 'pending']
        );
        uploadResults.push(result.rows[0]);
      }
    }

    // Update driver status
    await db.query(
      `UPDATE drivers 
       SET ${uploadType === 'vehicle-images' ? 'vehicle_images_verified' : 'documents_verified'} = false 
       WHERE id = $1`,
      [driverId]
    );

    res.status(201).json(uploadResults);

    const result = await db.query(
      `INSERT INTO file_uploads (
        filename,
        original_name,
        mime_type,
        size_bytes,
        path,
        url,
        uploaded_by,
        entity_type,
        entity_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
        file.path,
        fileUrl,
        req.user.id,
        entityType,
        entityId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get files for entity
// Get driver documents and vehicle images
router.get('/drivers/:driverId/files', authenticateToken, async (req, res) => {
  try {
    const { driverId } = req.params;

    const documents = await db.query(
      'SELECT * FROM driver_documents WHERE driver_id = $1 ORDER BY created_at DESC',
      [driverId]
    );

    const vehicleImages = await db.query(
      'SELECT * FROM driver_vehicle_images WHERE driver_id = $1 ORDER BY created_at DESC',
      [driverId]
    );

    res.json({
      documents: documents.rows,
      vehicleImages: vehicleImages.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify driver documents or vehicle images
router.post('/drivers/:driverId/verify/:uploadType', authenticateToken, async (req, res) => {
  try {
    const { driverId, uploadType } = req.params;
    const { fileIds, approved } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'No files specified for verification' });
    }

    if (!['documents', 'vehicle-images'].includes(uploadType)) {
      return res.status(400).json({ error: 'Invalid upload type' });
    }

    const table = uploadType === 'vehicle-images' ? 'driver_vehicle_images' : 'driver_documents';
    const status = approved ? 'approved' : 'rejected';

    // Update file statuses
    await db.query(
      `UPDATE ${table} 
       SET status = $1, verified_at = CURRENT_TIMESTAMP, verified_by = $2 
       WHERE id = ANY($3::int[])`,
      [status, req.user.id, fileIds]
    );

    // Check if all required files are approved
    const pendingFiles = await db.query(
      `SELECT COUNT(*) FROM ${table} 
       WHERE driver_id = $1 AND status != 'approved'`,
      [driverId]
    );

    if (pendingFiles.rows[0].count === '0') {
      // All files are approved, update driver status
      await db.query(
        `UPDATE drivers 
         SET ${uploadType === 'vehicle-images' ? 'vehicle_images_verified' : 'documents_verified'} = true 
         WHERE id = $1`,
        [driverId]
      );

      // Check if both documents and vehicle images are verified
      const driver = await db.query(
        'SELECT documents_verified, vehicle_images_verified FROM drivers WHERE id = $1',
        [driverId]
      );

      if (driver.rows[0].documents_verified && driver.rows[0].vehicle_images_verified) {
        // Activate the driver's account
        await db.query(
          'UPDATE drivers SET status = $1 WHERE id = $2',
          ['active', driverId]
        );
      }
    }

    res.json({ message: 'Verification status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await db.query(
      'DELETE FROM file_uploads WHERE id = $1 AND uploaded_by = $2 RETURNING *',
      [fileId, req.user.id]
    );

    if (file.rows.length === 0) {
      return res.status(404).json({ error: 'File not found or unauthorized' });
    }

    // TODO: Delete physical file from uploads directory

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
