import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  logger.info('Auth middleware processing request', {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader
  });

  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('No token provided in request', {
      path: req.path,
      method: req.method,
      headers: req.headers
    });
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('Token verified successfully', {
      userId: user.id,
      userRole: user.role
    });
    req.user = user;
    next();
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message,
      token: token.substring(0, 10) + '...', // Log only first 10 chars for security
      path: req.path,
      method: req.method
    });
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
