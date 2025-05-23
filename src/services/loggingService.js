import winston from 'winston';
import morgan from 'morgan';
import pool from '../db.js';

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Create custom Morgan token for user ID
morgan.token('user', (req) => req.user?.id || 'anonymous');

// Create custom Morgan format
const morganFormat = ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

// Create Morgan middleware
export const httpLogger = morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
});

// Audit logging functions
export const logAudit = async (userId, action, entityType, entityId, changes) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, changes
      ) VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, changes]
    );
  } catch (error) {
    logger.error('Error logging audit:', error);
  }
};

// Security event logging
export const logSecurityEvent = async (event) => {
  const {
    userId,
    action,
    ip,
    userAgent,
    success,
    details
  } = event;

  logger.warn('Security Event', {
    userId,
    action,
    ip,
    userAgent,
    success,
    details,
    timestamp: new Date().toISOString()
  });

  // For critical events, also log to database
  if (event.critical) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (
          user_id, action, entity_type, changes
        ) VALUES ($1, $2, $3, $4)`,
        [
          userId,
          action,
          'security_event',
          { ip, userAgent, success, details }
        ]
      );
    } catch (error) {
      logger.error('Error logging security event:', error);
    }
  }
};

// Error logging
export const logError = (error, req) => {
  logger.error('Application Error', {
    error: {
      message: error.message,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    },
    timestamp: new Date().toISOString()
  });
};

export default {
  logger,
  httpLogger,
  logAudit,
  logSecurityEvent,
  logError
};
