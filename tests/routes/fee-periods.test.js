import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import feePeriodsRouter from '../../src/routes/fee-periods.js';
import db from '../../src/db.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/fee-periods', feePeriodsRouter);

describe('Fee Periods Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/fee-periods', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app).get('/api/fee-periods');
      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not admin', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'driver' });

      const response = await request(app)
        .get('/api/fee-periods')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(403);
    });

    it('should return fee periods list for admin', async () => {
      const mockFeePeriods = [
        {
          id: 1,
          name: 'May 2025',
          start_date: '2025-05-01',
          end_date: '2025-05-31'
        }
      ];

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: mockFeePeriods });

      const response = await request(app)
        .get('/api/fee-periods')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFeePeriods);
    });
  });

  describe('POST /api/fee-periods', () => {
    it('should create new fee period with valid data', async () => {
      const newFeePeriod = {
        name: 'June 2025',
        start_date: '2025-06-01',
        end_date: '2025-06-30'
      };

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: [{ id: 1, ...newFeePeriod }] });

      const response = await request(app)
        .post('/api/fee-periods')
        .set('Authorization', 'Bearer fake-token')
        .send(newFeePeriod);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newFeePeriod.name);
    });

    it('should return 400 for invalid fee period data', async () => {
      const invalidFeePeriod = {
        name: 'Invalid Period',
        start_date: '2025-06-30', // End date before start date
        end_date: '2025-06-01'
      };

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });

      const response = await request(app)
        .post('/api/fee-periods')
        .set('Authorization', 'Bearer fake-token')
        .send(invalidFeePeriod);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PUT /api/fee-periods/:id', () => {
    it('should update fee period with valid data', async () => {
      const updatedFeePeriod = {
        name: 'Updated Period',
        start_date: '2025-07-01',
        end_date: '2025-07-31'
      };

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: [{ id: 1, ...updatedFeePeriod }] });

      const response = await request(app)
        .put('/api/fee-periods/1')
        .set('Authorization', 'Bearer fake-token')
        .send(updatedFeePeriod);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updatedFeePeriod.name);
    });

    it('should return 404 for non-existent fee period', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/fee-periods/999')
        .set('Authorization', 'Bearer fake-token')
        .send({
          name: 'Non-existent Period',
          start_date: '2025-08-01',
          end_date: '2025-08-31'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/fee-periods/:id', () => {
    it('should delete existing fee period', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const response = await request(app)
        .delete('/api/fee-periods/1')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Fee period deleted successfully');
    });

    it('should return 404 for non-existent fee period', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .delete('/api/fee-periods/999')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(404);
    });
  });
});
