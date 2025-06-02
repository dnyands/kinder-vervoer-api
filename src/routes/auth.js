import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: 'uploads/profile-pictures',
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF allowed.'));
    }
  }
});

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, first_name, last_name, phone_number } = req.body;
    
    // Check if user already exists
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Generate verification token
    const verification_token = crypto.randomBytes(32).toString('hex');

    // Insert new user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone_number, verification_token) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, role, first_name, last_name, phone_number`,
      [email, password_hash, role, first_name, last_name, phone_number, verification_token]
    );

    // TODO: Send verification email with token

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify email
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await db.query(
      'UPDATE users SET is_verified = true, verification_token = null WHERE verification_token = $1 RETURNING id',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.rows[0].id, token, expires_at]
    );

    // TODO: Send password reset email with token

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    const reset = await db.query(
      'SELECT user_id FROM password_resets WHERE token = $1 AND expires_at > NOW() AND created_at > NOW() - INTERVAL \'24 hours\'',
      [token]
    );

    if (reset.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', 
      [password_hash, reset.rows[0].user_id]
    );

    await db.query('DELETE FROM password_resets WHERE token = $1', [token]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
  try {
    const { first_name, last_name, phone_number } = req.body;
    const userId = req.user.id;

    let profile_picture_url = undefined;
    if (req.file) {
      profile_picture_url = `/uploads/profile-pictures/${req.file.filename}`;
    }

    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    if (first_name) {
      updateFields.push(`first_name = $${valueIndex}`);
      values.push(first_name);
      valueIndex++;
    }
    if (last_name) {
      updateFields.push(`last_name = $${valueIndex}`);
      values.push(last_name);
      valueIndex++;
    }

    if (phone_number) {
      updateFields.push(`phone_number = $${valueIndex}`);
      values.push(phone_number);
      valueIndex++;
    }

    if (profile_picture_url) {
      updateFields.push(`profile_picture_url = $${valueIndex}`);
      values.push(profile_picture_url);
      valueIndex++;
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length > 0) {
      values.push(userId);
      const result = await db.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${valueIndex} 
         RETURNING id, email, role, first_name, last_name, phone_number, profile_picture_url`,
        values
      );

      res.json(result.rows[0]);
    } else {
      res.status(400).json({ error: 'No fields to update' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user info
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      'SELECT id, email, role, first_name, last_name, phone_number, profile_picture_url FROM users WHERE id = $1',
      [userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@email.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: JWT token and user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        is_verified: user.is_verified 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        full_name: user.first_name + ' ' + user.last_name,
        phone_number: user.phone_number,
        profile_picture_url: user.profile_picture_url,
        is_verified: user.is_verified
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
