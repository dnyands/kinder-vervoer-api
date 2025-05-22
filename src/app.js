import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import morgan from 'morgan';
import studentsRouter from './routes/students.js';
import logger from './utils/logger.js';
import driversRouter from './routes/drivers.js';
import pickupRoutesRouter from './routes/pickup-routes.js';
import authRouter from './routes/auth.js';
import uploadRoutes from './routes/uploads.js';
import accountsRouter from './routes/accounts.js';

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

// Middleware
app.use(cors());
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
app.use('/accounts', accountsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/pickup-routes', pickupRoutesRouter);
app.use('/api/uploads', uploadRoutes);

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
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
