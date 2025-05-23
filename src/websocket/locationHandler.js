import { Server } from 'socket.io';
import { authenticateToken } from '../middleware/auth.js';

let io;

export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST']
    }
  });

  // Middleware to authenticate WebSocket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const user = await authenticateToken(token);
      if (!user) {
        return next(new Error('Invalid token'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle driver location updates
    socket.on('driver:location', async (data) => {
      try {
        // Broadcast to all clients tracking this driver
        socket.broadcast.to(`driver:${data.driverId}`).emit('location:update', {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          heading: data.heading,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // Join driver tracking room
    socket.on('track:driver', (driverId) => {
      socket.join(`driver:${driverId}`);
    });

    // Leave driver tracking room
    socket.on('untrack:driver', (driverId) => {
      socket.leave(`driver:${driverId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

// Export function to emit location updates
export const emitLocationUpdate = (driverId, locationData) => {
  if (io) {
    io.to(`driver:${driverId}`).emit('location:update', {
      driverId,
      ...locationData,
      timestamp: new Date()
    });
  }
};
