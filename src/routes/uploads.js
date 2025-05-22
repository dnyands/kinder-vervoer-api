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
    cb(null, 'uploads/documents');
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
router.post('/:entityType/:entityId', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate entity exists based on type
    let entityExists = false;
    switch (entityType) {
      case 'student':
        const student = await db.query('SELECT id FROM students WHERE id = $1', [entityId]);
        entityExists = student.rows.length > 0;
        break;
      case 'driver':
        const driver = await db.query('SELECT id FROM drivers WHERE id = $1', [entityId]);
        entityExists = driver.rows.length > 0;
        break;
      case 'route':
        const route = await db.query('SELECT id FROM pickup_routes WHERE id = $1', [entityId]);
        entityExists = route.rows.length > 0;
        break;
      default:
        return res.status(400).json({ error: 'Invalid entity type' });
    }

    if (!entityExists) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const fileUrl = `/uploads/documents/${file.filename}`;

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
router.get('/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const files = await db.query(
      'SELECT * FROM file_uploads WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [entityType, entityId]
    );

    res.json(files.rows);
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
