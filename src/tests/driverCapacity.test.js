import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { checkDriverCapacity } from '../controllers/driverCapacityController.js';

describe('Driver Capacity', () => {
  let testDriver;
  let testToken;

  beforeAll(async () => {
    // Create a test driver
    const driverResult = await db.query(
      `INSERT INTO drivers (name, surname, email, phone, vehicle_capacity, status, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      ['Test', 'Driver', 'test@driver.com', '+1234567890', 3, 'active', true]
    );
    testDriver = driverResult.rows[0];

    // Create a test user and get token
    const userResult = await db.query(
      `INSERT INTO users (name, email, password_hash, role_id, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['Test User', 'test@user.com', 'hashedpassword', 1, 'active']
    );
    
    // Get JWT token (implement your auth logic here)
    testToken = 'your-test-token';
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM students WHERE driver_id = $1', [testDriver.id]);
    await db.query('DELETE FROM drivers WHERE id = $1', [testDriver.id]);
    await db.query('DELETE FROM users WHERE email = $1', ['test@user.com']);
  });

  describe('GET /api/drivers/:id/capacity', () => {
    it('should return driver capacity information', async () => {
      const response = await request(app)
        .get(`/api/drivers/${testDriver.id}/capacity`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('driverId', testDriver.id);
      expect(response.body).toHaveProperty('vehicleCapacity', 3);
      expect(response.body).toHaveProperty('assignedStudents', 0);
      expect(response.body).toHaveProperty('availableSlots', 3);
    });

    it('should return 404 for non-existent driver', async () => {
      const response = await request(app)
        .get('/api/drivers/999999/capacity')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('checkDriverCapacity', () => {
    it('should return true when driver has available capacity', async () => {
      const hasCapacity = await checkDriverCapacity(testDriver.id);
      expect(hasCapacity).toBe(true);
    });

    it('should return false when driver is at full capacity', async () => {
      // Add students up to capacity
      for (let i = 0; i < 3; i++) {
        await db.query(
          `INSERT INTO students (full_name, age, home_address, driver_id, guardian_contact)
           VALUES ($1, $2, $3, $4, $5)`,
          [`Student ${i}`, 10, 'Test Address', testDriver.id, '+1234567890']
        );
      }

      const hasCapacity = await checkDriverCapacity(testDriver.id);
      expect(hasCapacity).toBe(false);

      // Clean up test students
      await db.query('DELETE FROM students WHERE driver_id = $1', [testDriver.id]);
    });

    it('should throw error for non-existent driver', async () => {
      await expect(checkDriverCapacity(999999)).rejects.toThrow('Driver not found');
    });
  });
});
