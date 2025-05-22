import { jest } from '@jest/globals';

// Mock the logger
jest.mock('../src/utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock the database
jest.mock('../src/db.js', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

// Mock JWT verification
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));
