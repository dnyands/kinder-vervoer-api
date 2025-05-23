import request from 'supertest';
import app from '../../src/app.js';
import pool from '../../src/db.js';
import { createTestDriver, cleanupTestDriver } from '../helpers/driverHelper.js';

describe('Driver Controller', () => {
  let testDriver;
  let authToken;

  beforeAll(async () => {
    // Create test driver and get auth token
    testDriver = await createTestDriver();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testDriver.email,
        password: testDriver.password
      });
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    await cleanupTestDriver(testDriver.id);
    await pool.end();
  });

  describe('GET /api/drivers/profile', () => {
    it('should return driver profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/drivers/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', testDriver.id);
      expect(res.body).toHaveProperty('email', testDriver.email);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get('/api/drivers/profile');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/drivers/location', () => {
    it('should update driver location', async () => {
      const location = {
        lat: -33.9249,
        lng: 18.4241
      };

      const res = await request(app)
        .patch('/api/drivers/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(location);

      expect(res.statusCode).toBe(200);
      expect(res.body.current_location_lat).toBe(location.lat);
      expect(res.body.current_location_lng).toBe(location.lng);
    });

    it('should create GPS log entry', async () => {
      const location = {
        lat: -33.9249,
        lng: 18.4241
      };

      await request(app)
        .patch('/api/drivers/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(location);

      // Verify GPS log was created
      const result = await pool.query(
        'SELECT * FROM gps_logs WHERE driver_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [testDriver.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].lat).toBe(location.lat);
      expect(result.rows[0].lng).toBe(location.lng);
    });
  });

  describe('GET /api/drivers/:id/heatmap', () => {
    it('should return heatmap data for driver', async () => {
      const res = await request(app)
        .get(`/api/drivers/${testDriver.id}/heatmap`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('lat');
        expect(res.body[0]).toHaveProperty('lng');
        expect(res.body[0]).toHaveProperty('weight');
      }
    });
  });
});
