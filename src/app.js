import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { specs } from './swagger/swagger.js';
import { createServer } from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import morgan from 'morgan';
import config from './config/index.js';
import studentsRouter from './routes/students.js';
import logger from './utils/logger.js';
import driversRouter from './routes/drivers.js';
import ratingsRouter from './routes/ratings.js';
import attendanceRouter from './routes/attendance.js';
import notificationsRouter from './routes/notifications.js';
import routesRouter from './routes/routes.js';
import parentRouter from './routes/parent.js';
import monitoringRoutes from './routes/driver-monitoring.js';
import { initializeWebSocket } from './services/websocketService.js';
import pickupRoutesRouter from './routes/pickup-routes.js';
import authRouter from './routes/auth.js';
import uploadRoutes from './routes/uploads.js';
import usersRouter from './routes/users.js';
import feePeriodsRouter from './routes/fee-periods.js';
import accountsRouter from './routes/accounts.js';
import subscriptionsRouter from './routes/subscriptions.js';

// Create upload directories if they don't exist
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirs = ['uploads/documents', 'uploads/profile-pictures'];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

dotenv.config();

const app = express();
const server = createServer(app);

// Middleware
// Initialize WebSocket service
initializeWebSocket(server);

app.use(cors({
  origin: config.server.frontendUrl,
  credentials: true
}));
app.use(express.json());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      query: req.query,
      userRole: req.user?.role
    });
  });
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/fee-periods', feePeriodsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/parents', parentRouter);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/pickup-routes', pickupRoutesRouter);
app.use('/api/uploads', uploadRoutes);
app.use('/api/subscriptions', subscriptionsRouter);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get("/", (req, res) => res.send("School Dropoff API is running"));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size is too large' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
