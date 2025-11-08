const Session = require('../models/Session');
const User = require('../models/User');
const EscrowService = require('../utils/escrowService');
const crypto = require('crypto');

// @desc    Create a session
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res) => {
  try {
    const { matchId, teacherId, skill, scheduledStart, duration } = req.body;

    const learnerId = req.user._id;

    // Calculate end time
    const scheduledEnd = new Date(new Date(scheduledStart).getTime() + duration * 60000);

    // Calculate credits needed (1 credit per 30 minutes)
    const creditsNeeded = Math.ceil(duration / 30);

    // Lock credits in escrow
    await EscrowService.lockCredits(learnerId, teacherId, null, creditsNeeded);

    // Generate unique video room ID
    const videoRoomId = crypto.randomBytes(16).toString('hex');

    // Create session
    const session = await Session.create({
      match: matchId,
      teacher: teacherId,
      learner: learnerId,
      skill,
      scheduledStart,
      scheduledEnd,
      duration,
      creditsLocked: creditsNeeded,
      videoRoomId,
      status: 'scheduled'
    });

    // Update escrow transaction with session ID
    await EscrowService.lockCredits(learnerId, teacherId, session._id, 0); // Update reference

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's sessions
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res) => {
  try {
    const { status, upcoming } = req.query;

    let query = {
      $or: [
        { teacher: req.user._id },
        { learner: req.user._id }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true') {
      query.scheduledStart = { $gte: new Date() };
    }

    const sessions = await Session.find(query)
      .populate('teacher learner', 'name email profileImage reputation')
      .populate('match')
      .sort({ scheduledStart: -1 });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get session by ID
// @route   GET /api/sessions/:id
// @access  Private
exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('teacher learner', 'name email profileImage reputation')
      .populate('match');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is part of this session
    if (
      session.teacher.toString() !== req.user._id.toString() &&
      session.learner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Start a session
// @route   PUT /api/sessions/:id/start
// @access  Private
exports.startSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.status = 'in-progress';
    session.actualStart = new Date();
    await session.save();

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Complete a session
// @route   PUT /api/sessions/:id/complete
// @access  Private
exports.completeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.status = 'completed';
    session.actualEnd = new Date();
    await session.save();

    // Release credits from escrow
    await EscrowService.releaseCredits(
      session.learner,
      session.teacher,
      session._id,
      session.creditsLocked
    );

    // Update completed sessions count
    await User.findByIdAndUpdate(session.teacher, { $inc: { completedSessions: 1 } });
    await User.findByIdAndUpdate(session.learner, { $inc: { completedSessions: 1 } });

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel a session
// @route   PUT /api/sessions/:id/cancel
// @access  Private
exports.cancelSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const { reason } = req.body;

    session.status = 'cancelled';
    session.cancelledBy = req.user._id;
    session.cancellationReason = reason;
    await session.save();

    // Refund credits to learner
    await EscrowService.refundCredits(session.learner, session._id, session.creditsLocked);

    // Apply penalty for late cancellation (within 24 hours)
    const hoursUntilSession = (new Date(session.scheduledStart) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilSession < 24 && hoursUntilSession > 0) {
      await EscrowService.applyPenalty(
        req.user._id,
        1,
        'Late cancellation penalty (within 24 hours)'
      );
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
