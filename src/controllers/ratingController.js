import pool from '../db.js';
import { ValidationError } from '../utils/errors.js';

export const createRating = async (req, res) => {
  const client = await pool.connect();
  try {
    const { driverId, rating, comment } = req.body;
    const parentId = req.user.id;

    // Validate input
    if (!driverId || !rating) {
      throw new ValidationError('Driver ID and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    // Check if parent can rate this driver
    const canRate = await client.query(
      'SELECT can_parent_rate_driver($1, $2) as can_rate',
      [parentId, driverId]
    );

    if (!canRate.rows[0].can_rate) {
      throw new ValidationError('You can only rate drivers who have transported your children');
    }

    // Create the rating
    const result = await client.query(
      `INSERT INTO driver_ratings (driver_id, parent_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, rating, comment, created_at`,
      [driverId, parentId, rating, comment]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.constraint === 'driver_ratings_driver_id_parent_id_key') {
      throw new ValidationError('You have already rated this driver');
    }
    throw error;
  } finally {
    client.release();
  }
};

export const getDriverRatings = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: driverId } = req.params;

    // Get average rating
    const avgRating = await client.query(
      `SELECT * FROM driver_average_ratings WHERE driver_id = $1`,
      [driverId]
    );

    // Get individual ratings with parent info
    const ratings = await client.query(
      `SELECT 
        dr.id,
        dr.rating,
        dr.comment,
        dr.created_at,
        u.first_name,
        u.last_name
       FROM driver_ratings dr
       JOIN users u ON u.id = dr.parent_id
       WHERE dr.driver_id = $1
       ORDER BY dr.created_at DESC`,
      [driverId]
    );

    res.json({
      averageRating: avgRating.rows[0]?.average_rating || 0,
      totalRatings: avgRating.rows[0]?.total_ratings || 0,
      ratings: ratings.rows
    });
  } finally {
    client.release();
  }
};
