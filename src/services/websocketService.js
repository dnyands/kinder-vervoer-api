import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map<userId, WebSocket[]>
    this.driverSubscriptions = new Map(); // Map<driverId, Set<userId>>

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws, req) {
    // Extract token from query string
    const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      const userId = decoded.id;

      // Store client connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, []);
      }
      this.clients.get(userId).push(ws);

      // Handle messages
      ws.on('message', (message) => this.handleMessage(userId, ws, message));

      // Handle client disconnect
      ws.on('close', () => this.handleDisconnect(userId, ws));

    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  }

  handleMessage(userId, ws, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe_driver':
          this.subscribeToDriver(userId, data.driverId);
          break;

        case 'unsubscribe_driver':
          this.unsubscribeFromDriver(userId, data.driverId);
          break;

        case 'driver_location':
          if (data.location) {
            this.broadcastDriverLocation(userId, data.location);
          }
          break;
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  handleDisconnect(userId, ws) {
    // Remove client from stored connections
    const userConnections = this.clients.get(userId) || [];
    const index = userConnections.indexOf(ws);
    if (index !== -1) {
      userConnections.splice(index, 1);
    }
    if (userConnections.length === 0) {
      this.clients.delete(userId);
      
      // Clean up driver subscriptions
      for (const [driverId, subscribers] of this.driverSubscriptions.entries()) {
        subscribers.delete(userId);
        if (subscribers.size === 0) {
          this.driverSubscriptions.delete(driverId);
        }
      }
    }
  }

  subscribeToDriver(userId, driverId) {
    if (!this.driverSubscriptions.has(driverId)) {
      this.driverSubscriptions.set(driverId, new Set());
    }
    this.driverSubscriptions.get(driverId).add(userId);
  }

  unsubscribeFromDriver(userId, driverId) {
    const subscribers = this.driverSubscriptions.get(driverId);
    if (subscribers) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.driverSubscriptions.delete(driverId);
      }
    }
  }

  broadcastDriverLocation(driverId, location) {
    const subscribers = this.driverSubscriptions.get(driverId);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'driver_location',
      driverId,
      location,
      timestamp: new Date().toISOString()
    });

    for (const userId of subscribers) {
      const userConnections = this.clients.get(userId) || [];
      for (const client of userConnections) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
  }

  // Helper method to broadcast notifications
  broadcastNotification(userId, notification) {
    const userConnections = this.clients.get(userId) || [];
    const message = JSON.stringify({
      type: 'notification',
      ...notification
    });

    for (const client of userConnections) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

let instance = null;

export const initializeWebSocket = (server) => {
  instance = new WebSocketService(server);
  return instance;
};

export const getWebSocketService = () => {
  if (!instance) {
    throw new Error('WebSocket service not initialized');
  }
  return instance;
};
