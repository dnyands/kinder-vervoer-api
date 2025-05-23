import pool from '../../src/db.js';
import bcrypt from 'bcrypt';

export const createTestDriver = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create user
    const email = `test.driver.${Date.now()}@example.com`;
    const password = 'testpassword123';
    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name,
        role, phone, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        email,
        passwordHash,
        'Test',
        'Driver',
        'driver',
        '+27123456789',
        true
      ]
    );

    const user = userResult.rows[0];

    // Create driver
    const driverResult = await client.query(
      `INSERT INTO drivers (
        user_id, vehicle_type, vehicle_model,
        license_plate, is_active, subscription_status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        user.id,
        'sedan',
        'Toyota Corolla',
        'TEST123GP',
        true,
        'active'
      ]
    );

    const driver = driverResult.rows[0];

    await client.query('COMMIT');

    return {
      id: driver.id,
      userId: user.id,
      email,
      password
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const cleanupTestDriver = async (driverId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get user ID
    const driverResult = await client.query(
      'SELECT user_id FROM drivers WHERE id = $1',
      [driverId]
    );

    if (driverResult.rows.length > 0) {
      const userId = driverResult.rows[0].user_id;

      // Delete driver
      await client.query('DELETE FROM drivers WHERE id = $1', [driverId]);

      // Delete user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
