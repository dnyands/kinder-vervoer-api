import { pool } from '../db.js';

export const checkSubscription = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { driverId } = req.params;
    
    // Check if driver has active subscription
    const result = await client.query(
      `SELECT EXISTS(
         SELECT 1 FROM driver_subscriptions 
         WHERE driver_id = $1 
         AND status = 'active' 
         AND end_date >= CURRENT_DATE
       ) as has_subscription`,
      [driverId]
    );
    
    if (!result.rows[0].has_subscription) {
      return res.status(403).json({ 
        error: 'Active subscription required to access this resource' 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify subscription' });
  } finally {
    client.release();
  }
};

export const requireVerification = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { driverId } = req.params;
    
    // Check if driver is verified
    const result = await client.query(
      `SELECT is_verified 
       FROM drivers 
       WHERE id = $1`,
      [driverId]
    );
    
    if (!result.rows[0]?.is_verified) {
      return res.status(403).json({ 
        error: 'Driver must be verified to access this resource' 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify driver status' });
  } finally {
    client.release();
  }
};
