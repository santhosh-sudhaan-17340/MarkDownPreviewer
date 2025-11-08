const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { subscriber } = require('../../config/redis');
const logger = require('../../utils/logger');
const { errorHandler, notFound } = require('../../middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.TRACKING_SERVICE_PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Tracking Service',
    status: 'healthy',
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Store active connections
const activeConnections = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join order tracking room
  socket.on('track_order', (data) => {
    const { orderId, userType, userId } = data;

    logger.info(`User ${userId} (${userType}) tracking order ${orderId}`);

    // Join room for this order
    socket.join(`order:${orderId}`);

    // Store connection info
    activeConnections.set(socket.id, {
      orderId,
      userType,
      userId,
      joinedAt: new Date()
    });

    // Send confirmation
    socket.emit('tracking_started', {
      success: true,
      orderId,
      message: 'Real-time tracking started'
    });

    // Send current order status (would fetch from database in production)
    socket.emit('order_update', {
      orderId,
      status: 'Order tracking active',
      timestamp: new Date()
    });
  });

  // Partner location update
  socket.on('update_location', (data) => {
    const { orderId, latitude, longitude, accuracy, speed, bearing } = data;

    // Broadcast location to all users tracking this order
    io.to(`order:${orderId}`).emit('location_update', {
      orderId,
      location: {
        latitude,
        longitude,
        accuracy,
        speed,
        bearing,
        timestamp: new Date()
      }
    });

    logger.info(`Location updated for order ${orderId}: ${latitude}, ${longitude}`);
  });

  // Order status update
  socket.on('update_status', (data) => {
    const { orderId, status, message } = data;

    io.to(`order:${orderId}`).emit('status_update', {
      orderId,
      status,
      message,
      timestamp: new Date()
    });

    logger.info(`Status updated for order ${orderId}: ${status}`);
  });

  // Stop tracking
  socket.on('stop_tracking', (data) => {
    const { orderId } = data;

    socket.leave(`order:${orderId}`);
    activeConnections.delete(socket.id);

    socket.emit('tracking_stopped', {
      success: true,
      orderId,
      message: 'Tracking stopped'
    });

    logger.info(`Stopped tracking order ${orderId} for socket ${socket.id}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      logger.info(`Client disconnected: ${socket.id}, was tracking order ${connection.orderId}`);
      activeConnections.delete(socket.id);
    } else {
      logger.info(`Client disconnected: ${socket.id}`);
    }
  });

  // Error handling
  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// Redis pub/sub for inter-service communication
subscriber.subscribe('order:status_changed', (err) => {
  if (err) {
    logger.error('Failed to subscribe to order:status_changed:', err);
  } else {
    logger.info('Subscribed to order:status_changed channel');
  }
});

subscriber.subscribe('partner:location_update', (err) => {
  if (err) {
    logger.error('Failed to subscribe to partner:location_update:', err);
  } else {
    logger.info('Subscribed to partner:location_update channel');
  }
});

// Handle Redis messages
subscriber.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);

    if (channel === 'order:status_changed') {
      const { orderId, status, message: statusMessage } = data;

      io.to(`order:${orderId}`).emit('status_update', {
        orderId,
        status,
        message: statusMessage,
        timestamp: new Date()
      });

      logger.info(`Broadcasted status update for order ${orderId}: ${status}`);
    }

    if (channel === 'partner:location_update') {
      const { orderId, location } = data;

      io.to(`order:${orderId}`).emit('location_update', {
        orderId,
        location,
        timestamp: new Date()
      });

      logger.info(`Broadcasted location update for order ${orderId}`);
    }
  } catch (error) {
    logger.error('Error processing Redis message:', error);
  }
});

// REST endpoints for tracking info
app.get('/api/tracking/:orderId/active', (req, res) => {
  const { orderId } = req.params;
  const roomName = `order:${orderId}`;

  const activeTrackers = io.sockets.adapter.rooms.get(roomName);
  const count = activeTrackers ? activeTrackers.size : 0;

  res.json({
    success: true,
    data: {
      orderId,
      activeTrackers: count,
      isBeingTracked: count > 0
    }
  });
});

app.get('/api/tracking/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalConnections: io.engine.clientsCount,
      activeOrders: activeConnections.size,
      rooms: io.sockets.adapter.rooms.size
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  logger.info(`Tracking Service running on port ${PORT}`);
  logger.info(`WebSocket server ready for real-time tracking`);
});

module.exports = { app, io };
