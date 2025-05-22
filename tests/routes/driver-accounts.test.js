import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import driverAccountsRouter from '../../src/routes/driver-accounts.js';
import db from '../../src/db.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/driver-accounts', driverAccountsRouter);

describe('Driver Accounts Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/driver-accounts', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app).get('/api/driver-accounts');
      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not admin', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'driver' });

      const response = await request(app)
        .get('/api/driver-accounts')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(403);
    });

    it('should return driver accounts list for admin', async () => {
      const mockAccounts = [
        {
          id: 1,
          driver_id: 1,
          fee_period_id: 1,
          amount_charged: 100,
          amount_paid: 0,
          payment_status: 'pending'
        }
      ];

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: mockAccounts });

      const response = await request(app)
        .get('/api/driver-accounts')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAccounts);
    });
  });

  describe('POST /api/driver-accounts', () => {
    it('should create new driver account with valid data', async () => {
      const newAccount = {
        driver_id: 1,
        fee_period_id: 1,
        amount_charged: 100,
        payment_due_date: '2025-06-01'
      };

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: [{ id: 1, ...newAccount }] });

      const response = await request(app)
        .post('/api/driver-accounts')
        .set('Authorization', 'Bearer fake-token')
        .send(newAccount);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.driver_id).toBe(newAccount.driver_id);
    });

    it('should return 400 for invalid driver account data', async () => {
      const invalidAccount = {
        driver_id: 1,
        // Missing required fields
      };

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });

      const response = await request(app)
        .post('/api/driver-accounts')
        .set('Authorization', 'Bearer fake-token')
        .send(invalidAccount);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/driver-accounts/driver/:driverId', () => {
    it('should return driver accounts for admin', async () => {
      const mockAccounts = [
        {
          id: 1,
          driver_id: 1,
          fee_period_id: 1,
          amount_charged: 100
        }
      ];

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: mockAccounts });

      const response = await request(app)
        .get('/api/driver-accounts/driver/1')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAccounts);
    });

    it('should return driver accounts for the owner driver', async () => {
      const mockAccounts = [
        {
          id: 1,
          driver_id: 1,
          fee_period_id: 1,
          amount_charged: 100
        }
      ];

      jwt.verify.mockReturnValue({ id: 1, role: 'driver' });
      db.query
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Driver lookup
        .mockResolvedValueOnce({ rows: mockAccounts }); // Accounts lookup

      const response = await request(app)
        .get('/api/driver-accounts/driver/1')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAccounts);
    });

    it('should return 403 for non-owner driver', async () => {
      jwt.verify.mockReturnValue({ id: 2, role: 'driver' });
      db.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }); // Different user_id

      const response = await request(app)
        .get('/api/driver-accounts/driver/1')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/driver-accounts/:id', () => {
    it('should update driver account payment status', async () => {
      const updateData = {
        amount_paid: 100,
        payment_status: 'paid',
        notes: 'Payment received'
      };

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: [{ id: 1, ...updateData }] });

      const response = await request(app)
        .put('/api/driver-accounts/1')
        .set('Authorization', 'Bearer fake-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.payment_status).toBe(updateData.payment_status);
    });

    it('should return 404 for non-existent account', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/driver-accounts/999')
        .set('Authorization', 'Bearer fake-token')
        .send({
          amount_paid: 100,
          payment_status: 'paid'
        });

      expect(response.status).toBe(404);
    });
  });
});
