import app from "./app.js";
import { createServer } from 'http';
import dotenv from "dotenv";
import { initializeWebSocket } from './services/websocketService.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});
