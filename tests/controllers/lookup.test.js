import request from 'supertest';
import app from '../../src/app.js';
import pool from '../../src/db.js';
import { generateToken } from '../../src/utils/jwt.js';

describe('Lookup Controller', () => {
  let adminToken;
  let userToken;
  let testProvince;
  let testTown;

  beforeAll(async () => {
    // Create tokens
    adminToken = generateToken({ id: 1, role: 'admin' });
    userToken = generateToken({ id: 2, role: 'user' });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Province CRUD', () => {
    it('should create a province when admin', async () => {
      const res = await request(app)
        .post('/api/lookups/provinces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Province',
          code: 'TP'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('name', 'Test Province');
      testProvince = res.body;
    });

    it('should not create a province when not admin', async () => {
      const res = await request(app)
        .post('/api/lookups/provinces')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Province 2',
          code: 'TP2'
        });

      expect(res.statusCode).toBe(403);
    });

    it('should get all provinces', async () => {
      const res = await request(app)
        .get('/api/lookups/provinces');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should get province by id', async () => {
      const res = await request(app)
        .get(`/api/lookups/provinces/${testProvince.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', testProvince.id);
    });

    it('should update province when admin', async () => {
      const res = await request(app)
        .put(`/api/lookups/provinces/${testProvince.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Province'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'Updated Province');
    });
  });

  describe('Town CRUD', () => {
    it('should create a town when admin', async () => {
      const res = await request(app)
        .post('/api/lookups/towns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Town',
          province_id: testProvince.id,
          postal_code: '1234'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('name', 'Test Town');
      testTown = res.body;
    });

    it('should not create a town with invalid province_id', async () => {
      const res = await request(app)
        .post('/api/lookups/towns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Town',
          province_id: 99999,
          postal_code: '1234'
        });

      expect(res.statusCode).toBe(400);
    });

    it('should get all towns with province filter', async () => {
      const res = await request(app)
        .get('/api/lookups/towns')
        .query({ province_id: testProvince.id });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('Delete Protection', () => {
    it('should not delete province with dependent towns', async () => {
      const res = await request(app)
        .delete(`/api/lookups/provinces/${testProvince.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('in use');
    });

    it('should delete town when no dependencies', async () => {
      const res = await request(app)
        .delete(`/api/lookups/towns/${testTown.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should now delete province', async () => {
      const res = await request(app)
        .delete(`/api/lookups/provinces/${testProvince.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Vehicle Types', () => {
    it('should create a vehicle type', async () => {
      const res = await request(app)
        .post('/api/lookups/vehicleTypes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Vehicle',
          max_capacity: 10,
          description: 'Test vehicle type'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('name', 'Test Vehicle');
    });
  });

  describe('School Types', () => {
    it('should create a school type', async () => {
      const res = await request(app)
        .post('/api/lookups/schoolTypes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test School Type',
          description: 'Test school type'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('name', 'Test School Type');
    });
  });
});
