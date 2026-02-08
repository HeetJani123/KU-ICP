import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SimulationEngine } from './engine/SimulationEngine.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Initialize Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Intercept console logs and broadcast to frontend
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args: any[]) => {
  originalConsoleLog(...args);
  io.emit('backend_log', { type: 'log', message: args });
};

console.error = (...args: any[]) => {
  originalConsoleError(...args);
  io.emit('backend_log', { type: 'error', message: args });
};

console.warn = (...args: any[]) => {
  originalConsoleWarn(...args);
  io.emit('backend_log', { type: 'warn', message: args });
};

// Initialize Simulation Engine
const simulation = new SimulationEngine();

// Set up broadcast callback for simulation events
simulation.setBroadcastCallback((event: string, data: any) => {
  io.emit(event, data);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('👤 Client disconnected:', socket.id);
  });

  // Handle client requesting initial state
  socket.on('request_initial_state', async () => {
    try {
      console.log('📡 Client requesting initial state');
      const stats = simulation.getStats();
      socket.emit('initial_state', stats);
    } catch (error) {
      console.error('Error sending initial state:', error);
      socket.emit('error', { message: 'Failed to load initial state' });
    }
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Simcity.AI Backend',
    simulation: simulation.getStats()
  });
});

// API Routes
app.get('/api/world-state', async (req, res) => {
  try {
    const stats = simulation.getStats();
    res.json(stats.worldState);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch world state' });
  }
});

app.get('/api/agents', async (req, res) => {
  try {
    const stats = simulation.getStats();
    res.json({ agents: stats.agents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = simulation.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Reset simulation endpoint
app.post('/api/reset', async (req, res) => {
  try {
    console.log('\n🔄 RESET requested by client\n');
    await simulation.reset();
    const stats = simulation.getStats();
    res.json({ success: true, message: 'Simulation reset successfully', stats });
  } catch (error) {
    console.error('Error resetting simulation:', error);
    res.status(500).json({ error: 'Failed to reset simulation' });
  }
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  console.log('');
  console.log('🏙️  SIMCITY.AI BACKEND SERVER');
  console.log('================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log('');
  
  // Start the simulation engine
  console.log('🎬 Starting simulation engine...\n');
  await simulation.start();
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log('');
});

// Export for use in simulation engine
export { app, httpServer };
