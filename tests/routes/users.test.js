import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import usersRouter from '../../src/routes/users.js';
import db from '../../src/db.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not admin', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'driver' });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied. Admin only.');
    });

    it('should return users list for admin', async () => {
      const mockUsers = [
        {
          id: 1,
          email: 'test@example.com',
          role: 'admin',
          full_name: 'Test User'
        }
      ];

      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockResolvedValue({ rows: mockUsers });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
      expect(db.query).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'admin' });
      db.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });
});
