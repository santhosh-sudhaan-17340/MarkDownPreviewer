const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// WebRTC signaling for video sessions
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-room', ({ roomId, userId }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(userId);

    // Notify others in the room
    socket.to(roomId).emit('user-joined', { userId, socketId: socket.id });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-left', { userId });
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(userId);
        if (rooms.get(roomId).size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });

  // WebRTC signaling
  socket.on('offer', ({ roomId, offer, to }) => {
    socket.to(roomId).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ roomId, answer, to }) => {
    socket.to(roomId).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ roomId, candidate, to }) => {
    socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
  });

  // Session events
  socket.on('session-started', ({ roomId }) => {
    io.to(roomId).emit('session-started');
  });

  socket.on('session-ended', ({ roomId }) => {
    io.to(roomId).emit('session-ended');
  });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = { app, io };
