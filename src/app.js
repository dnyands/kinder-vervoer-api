import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import studentsRouter from './routes/students.js';
import driversRouter from './routes/drivers.js';
import pickupRoutesRouter from './routes/pickup-routes.js';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/pickup-routes', pickupRoutesRouter);

app.get("/", (req, res) => res.send("School Dropoff API is running"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
