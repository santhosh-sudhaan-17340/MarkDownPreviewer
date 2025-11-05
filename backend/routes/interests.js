const express = require('express');
const router = express.Router();
const Interest = require('../models/Interest');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/interests/send
// @desc    Send interest to a profile
// @access  Private
router.post('/send', protect, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Cannot send interest to self
    if (receiverId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send interest to yourself'
      });
    }

    // Check if interest already exists
    const existingInterest = await Interest.findOne({
      sender: req.user.id,
      receiver: receiverId
    });

    if (existingInterest) {
      return res.status(400).json({
        success: false,
        message: 'Interest already sent to this profile'
      });
    }

    const interest = await Interest.create({
      sender: req.user.id,
      receiver: receiverId,
      message: message || ''
    });

    await interest.populate('sender', 'firstName lastName profilePhoto age occupation');
    await interest.populate('receiver', 'firstName lastName profilePhoto age occupation');

    res.status(201).json({
      success: true,
      message: 'Interest sent successfully',
      interest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/interests/sent
// @desc    Get all sent interests
// @access  Private
router.get('/sent', protect, async (req, res) => {
  try {
    const interests = await Interest.find({ sender: req.user.id })
      .populate('receiver', 'firstName lastName profilePhoto age occupation education city gotra')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: interests.length,
      interests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/interests/received
// @desc    Get all received interests
// @access  Private
router.get('/received', protect, async (req, res) => {
  try {
    const interests = await Interest.find({ receiver: req.user.id })
      .populate('sender', 'firstName lastName profilePhoto age occupation education city gotra')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: interests.length,
      interests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/interests/:id/accept
// @desc    Accept an interest
// @access  Private
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const interest = await Interest.findOne({
      _id: req.params.id,
      receiver: req.user.id
    });

    if (!interest) {
      return res.status(404).json({
        success: false,
        message: 'Interest not found'
      });
    }

    if (interest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Interest has already been responded to'
      });
    }

    interest.status = 'accepted';
    interest.responseMessage = req.body.message || '';
    interest.respondedAt = Date.now();
    await interest.save();

    await interest.populate('sender', 'firstName lastName email phone profilePhoto');
    await interest.populate('receiver', 'firstName lastName email phone profilePhoto');

    res.json({
      success: true,
      message: 'Interest accepted',
      interest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/interests/:id/reject
// @desc    Reject an interest
// @access  Private
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const interest = await Interest.findOne({
      _id: req.params.id,
      receiver: req.user.id
    });

    if (!interest) {
      return res.status(404).json({
        success: false,
        message: 'Interest not found'
      });
    }

    if (interest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Interest has already been responded to'
      });
    }

    interest.status = 'rejected';
    interest.responseMessage = req.body.message || '';
    interest.respondedAt = Date.now();
    await interest.save();

    res.json({
      success: true,
      message: 'Interest rejected',
      interest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/interests/:id
// @desc    Cancel sent interest
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const interest = await Interest.findOne({
      _id: req.params.id,
      sender: req.user.id
    });

    if (!interest) {
      return res.status(404).json({
        success: false,
        message: 'Interest not found'
      });
    }

    await interest.deleteOne();

    res.json({
      success: true,
      message: 'Interest cancelled'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/interests/accepted
// @desc    Get all accepted interests (mutual matches)
// @access  Private
router.get('/accepted', protect, async (req, res) => {
  try {
    const interests = await Interest.find({
      $or: [
        { sender: req.user.id, status: 'accepted' },
        { receiver: req.user.id, status: 'accepted' }
      ]
    })
    .populate('sender', 'firstName lastName profilePhoto age occupation education phone email city gotra')
    .populate('receiver', 'firstName lastName profilePhoto age occupation education phone email city gotra')
    .sort({ respondedAt: -1 });

    res.json({
      success: true,
      count: interests.length,
      interests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
