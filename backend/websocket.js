const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('./models');

function initializeWebSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.is_active) {
        return next(new Error('Invalid authentication'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userName = user.full_name;

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userName} (${socket.userId})`);

    // Join user's personal room
    socket.join(`user_${socket.userId}`);

    // Join role-based room
    socket.join(`role_${socket.userRole}`);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to real-time notifications',
      userId: socket.userId
    });

    // Handle ticket subscription (watch ticket)
    socket.on('subscribe_ticket', (ticketId) => {
      socket.join(`ticket_${ticketId}`);
      console.log(`User ${socket.userId} subscribed to ticket ${ticketId}`);
    });

    // Handle ticket unsubscription
    socket.on('unsubscribe_ticket', (ticketId) => {
      socket.leave(`ticket_${ticketId}`);
      console.log(`User ${socket.userId} unsubscribed from ticket ${ticketId}`);
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      socket.to(`ticket_${data.ticketId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName,
        ticketId: data.ticketId
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      socket.to(`ticket_${data.ticketId}`).emit('user_stop_typing', {
        userId: socket.userId,
        ticketId: data.ticketId
      });
    });

    // Mark notification as read
    socket.on('mark_notification_read', async (notificationId) => {
      const NotificationService = require('./services/notificationService');
      await NotificationService.markAsRead(notificationId, socket.userId);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userName} (${socket.userId})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Broadcast events

  // Broadcast ticket update to all watchers
  io.broadcastTicketUpdate = (ticketId, event, data) => {
    io.to(`ticket_${ticketId}`).emit(event, data);
  };

  // Broadcast to specific user
  io.broadcastToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  };

  // Broadcast to role
  io.broadcastToRole = (role, event, data) => {
    io.to(`role_${role}`).emit(event, data);
  };

  // Broadcast notification
  io.broadcastNotification = (userId, notification) => {
    io.to(`user_${userId}`).emit('notification', notification);
  };

  // Broadcast ticket created
  io.broadcastTicketCreated = (ticket) => {
    io.to('role_agent').emit('ticket_created', ticket);
    io.to('role_admin').emit('ticket_created', ticket);
  };

  // Broadcast ticket assigned
  io.broadcastTicketAssigned = (ticket, agentId) => {
    io.to(`user_${agentId}`).emit('ticket_assigned', ticket);
    io.to(`ticket_${ticket.id}`).emit('ticket_updated', { event: 'assigned', ticket });
  };

  // Broadcast ticket status changed
  io.broadcastTicketStatusChanged = (ticket, oldStatus, newStatus) => {
    io.to(`ticket_${ticket.id}`).emit('ticket_status_changed', {
      ticket,
      oldStatus,
      newStatus
    });
  };

  // Broadcast new comment
  io.broadcastNewComment = (ticketId, comment) => {
    io.to(`ticket_${ticketId}`).emit('new_comment', comment);
  };

  // Broadcast SLA breach
  io.broadcastSLABreach = (ticket) => {
    io.to(`ticket_${ticket.id}`).emit('sla_breach', ticket);
    io.to('role_admin').emit('sla_breach_alert', ticket);

    if (ticket.assigned_agent_id) {
      io.to(`user_${ticket.assigned_agent_id}`).emit('sla_breach_alert', ticket);
    }
  };

  // Broadcast ticket escalated
  io.broadcastTicketEscalated = (ticket, escalationData) => {
    io.to(`ticket_${ticket.id}`).emit('ticket_escalated', { ticket, escalation: escalationData });
    io.to('role_admin').emit('ticket_escalation_alert', { ticket, escalation: escalationData });

    if (escalationData.escalated_to) {
      io.to(`user_${escalationData.escalated_to}`).emit('ticket_escalated_to_you', ticket);
    }
  };

  // Make io globally accessible
  global.io = io;

  return io;
}

module.exports = initializeWebSocket;
