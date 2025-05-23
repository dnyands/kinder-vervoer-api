import pool from '../db.js';

/**
 * @swagger
 * /api/analytics/driver-count-by-province:
 *   get:
 *     tags: [Analytics]
 *     summary: Get driver count by province
 *     responses:
 *       200:
 *         description: Driver count by province retrieved successfully
 */
export const getDriverCountByProvince = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM analytics_driver_count_by_province ORDER BY province'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting driver count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/analytics/student-count-by-town:
 *   get:
 *     tags: [Analytics]
 *     summary: Get student count by town
 *     responses:
 *       200:
 *         description: Student count by town retrieved successfully
 */
export const getStudentCountByTown = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM analytics_student_count_by_town ORDER BY province, town'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting student count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/analytics/average-trip-duration:
 *   get:
 *     tags: [Analytics]
 *     summary: Get average trip duration
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to analyze (default 30)
 *     responses:
 *       200:
 *         description: Average trip duration retrieved successfully
 */
export const getAverageTripDuration = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  
  try {
    const result = await pool.query(
      `SELECT 
        date,
        avg_duration_minutes,
        total_trips
      FROM analytics_trip_metrics
      WHERE date >= CURRENT_DATE - $1::integer
      ORDER BY date DESC`,
      [days]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting trip duration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/analytics/ontime-percentage:
 *   get:
 *     tags: [Analytics]
 *     summary: Get on-time arrival percentage
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to analyze (default 30)
 *     responses:
 *       200:
 *         description: On-time percentage retrieved successfully
 */
export const getOntimePercentage = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  
  try {
    const result = await pool.query(
      `SELECT 
        date,
        ontime_percentage,
        total_trips
      FROM analytics_trip_metrics
      WHERE date >= CURRENT_DATE - $1::integer
      ORDER BY date DESC`,
      [days]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting ontime percentage:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
