const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Store active sessions
const activeSessions = new Map();
const breakoutRooms = new Map();
const userConnections = new Map();
const attendanceRecords = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join classroom
  socket.on('join-class', ({ classId, userId, userName, role }) => {
    socket.join(classId);

    // Track user connection
    userConnections.set(socket.id, { userId, userName, role, classId });

    // Record attendance
    if (!attendanceRecords.has(classId)) {
      attendanceRecords.set(classId, new Map());
    }
    attendanceRecords.get(classId).set(userId, {
      userId,
      userName,
      joinedAt: new Date(),
      leftAt: null,
      duration: 0
    });

    // Notify others
    socket.to(classId).emit('user-joined', { userId, userName, role });

    // Send current session info
    const sessionInfo = activeSessions.get(classId);
    if (sessionInfo) {
      socket.emit('session-info', sessionInfo);
    }

    console.log(`${userName} joined class ${classId}`);
  });

  // WebRTC signaling for video streaming
  socket.on('offer', ({ offer, classId, userId }) => {
    socket.to(classId).emit('offer', { offer, userId, socketId: socket.id });
  });

  socket.on('answer', ({ answer, targetSocketId }) => {
    io.to(targetSocketId).emit('answer', { answer, socketId: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, classId, targetSocketId }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', { candidate, socketId: socket.id });
    } else {
      socket.to(classId).emit('ice-candidate', { candidate, socketId: socket.id });
    }
  });

  // Screen sharing
  socket.on('start-screen-share', ({ classId, userId }) => {
    socket.to(classId).emit('screen-share-started', { userId, socketId: socket.id });
  });

  socket.on('stop-screen-share', ({ classId, userId }) => {
    socket.to(classId).emit('screen-share-stopped', { userId });
  });

  // Quiz management
  socket.on('start-quiz', ({ classId, quiz }) => {
    const sessionInfo = activeSessions.get(classId) || {};
    sessionInfo.activeQuiz = quiz;
    sessionInfo.quizResponses = new Map();
    activeSessions.set(classId, sessionInfo);

    socket.to(classId).emit('quiz-started', quiz);
  });

  socket.on('submit-quiz-answer', ({ classId, userId, userName, quizId, answers }) => {
    const sessionInfo = activeSessions.get(classId);
    if (sessionInfo && sessionInfo.activeQuiz) {
      if (!sessionInfo.quizResponses) {
        sessionInfo.quizResponses = new Map();
      }
      sessionInfo.quizResponses.set(userId, {
        userId,
        userName,
        answers,
        submittedAt: new Date()
      });

      // Notify instructor
      const userInfo = userConnections.get(socket.id);
      io.to(classId).emit('quiz-response-received', {
        userId,
        userName,
        totalResponses: sessionInfo.quizResponses.size
      });
    }
  });

  socket.on('end-quiz', ({ classId, results }) => {
    const sessionInfo = activeSessions.get(classId);
    if (sessionInfo) {
      sessionInfo.activeQuiz = null;
      activeSessions.set(classId, sessionInfo);
    }

    socket.to(classId).emit('quiz-ended', results);
  });

  // Breakout rooms
  socket.on('create-breakout-rooms', ({ classId, rooms }) => {
    breakoutRooms.set(classId, rooms);
    io.to(classId).emit('breakout-rooms-created', rooms);
  });

  socket.on('assign-to-breakout', ({ classId, roomId, userId }) => {
    const rooms = breakoutRooms.get(classId);
    if (rooms) {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        socket.join(`${classId}-breakout-${roomId}`);
        socket.emit('assigned-to-breakout', { roomId, roomName: room.name });
      }
    }
  });

  socket.on('leave-breakout', ({ classId, roomId }) => {
    socket.leave(`${classId}-breakout-${roomId}`);
    socket.join(classId);
    socket.emit('returned-to-main-room');
  });

  socket.on('breakout-message', ({ classId, roomId, message }) => {
    io.to(`${classId}-breakout-${roomId}`).emit('breakout-message', message);
  });

  // Chat messages
  socket.on('chat-message', ({ classId, message, userName, userId }) => {
    io.to(classId).emit('chat-message', {
      message,
      userName,
      userId,
      timestamp: new Date()
    });
  });

  // Hand raise
  socket.on('raise-hand', ({ classId, userId, userName }) => {
    io.to(classId).emit('hand-raised', { userId, userName });
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const userInfo = userConnections.get(socket.id);
    if (userInfo) {
      const { userId, userName, classId } = userInfo;

      // Update attendance
      const classAttendance = attendanceRecords.get(classId);
      if (classAttendance && classAttendance.has(userId)) {
        const record = classAttendance.get(userId);
        record.leftAt = new Date();
        record.duration = (record.leftAt - record.joinedAt) / 1000 / 60; // minutes
      }

      socket.to(classId).emit('user-left', { userId, userName });
      userConnections.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/attendance/:classId', (req, res) => {
  const { classId } = req.params;
  const attendance = attendanceRecords.get(classId);

  if (attendance) {
    const records = Array.from(attendance.values());
    res.json({ classId, records, total: records.length });
  } else {
    res.json({ classId, records: [], total: 0 });
  }
});

app.post('/api/session/start', (req, res) => {
  const { classId, instructorId, title } = req.body;

  activeSessions.set(classId, {
    classId,
    instructorId,
    title,
    startedAt: new Date(),
    activeQuiz: null,
    quizResponses: new Map()
  });

  res.json({ success: true, message: 'Session started' });
});

app.post('/api/session/end', (req, res) => {
  const { classId } = req.body;

  const session = activeSessions.get(classId);
  if (session) {
    session.endedAt = new Date();
    activeSessions.delete(classId);
  }

  res.json({ success: true, message: 'Session ended' });
});

// File upload for assignments
const multer = require('multer');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.post('/api/assignment/upload', upload.single('assignment'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    path: `/uploads/${req.file.filename}`
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});
