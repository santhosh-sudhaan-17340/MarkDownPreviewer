const express = require('express');
const router = express.Router();
const DeliveryPartner = require('../../database/mongodb/models/DeliveryPartner');
const { generateToken } = require('../../middleware/auth');
const { authenticate } = require('../../middleware/auth');
const { AppError } = require('../../middleware/errorHandler');
const partnerAssignment = require('./partnerAssignment');

// Partner registration
router.post('/register', async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.create(req.body);
    const token = generateToken(partner._id, 'delivery_partner');

    res.status(201).json({
      success: true,
      message: 'Partner registered successfully',
      data: { partner, token }
    });
  } catch (error) {
    next(error);
  }
});

// Partner login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const partner = await DeliveryPartner.findOne({ email }).select('+password');
    if (!partner || !(await partner.comparePassword(password))) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!partner.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    partner.lastActive = new Date();
    await partner.save();

    const token = generateToken(partner._id, 'delivery_partner');

    res.json({
      success: true,
      data: { partner, token }
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.use(authenticate);

// Get partner profile
router.get('/profile', async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.user.userId);
    res.json({ success: true, data: partner });
  } catch (error) {
    next(error);
  }
});

// Update partner profile
router.put('/profile', async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.user.userId,
      req.body,
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: partner });
  } catch (error) {
    next(error);
  }
});

// Update partner location (real-time)
router.put('/location', async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, speed, bearing } = req.body;

    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.user.userId,
      {
        currentLocation: {
          latitude,
          longitude,
          accuracy,
          lastUpdated: new Date()
        },
        lastActive: new Date()
      },
      { new: true }
    );

    res.json({ success: true, data: partner.currentLocation });
  } catch (error) {
    next(error);
  }
});

// Update partner status (available/offline/busy)
router.put('/status', async (req, res, next) => {
  try {
    const { status, isOnline } = req.body;

    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.user.userId,
      { status, isOnline, lastActive: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: partner
    });
  } catch (error) {
    next(error);
  }
});

// Accept order assignment
router.post('/orders/:orderId/accept', async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.user.userId);

    if (partner.status !== 'busy' || partner.currentOrder.orderId !== req.params.orderId) {
      throw new AppError('No pending order assignment', 400);
    }

    partner.currentOrder.status = 'accepted';
    partner.status = 'on_delivery';
    await partner.save();

    res.json({
      success: true,
      message: 'Order accepted',
      data: partner
    });
  } catch (error) {
    next(error);
  }
});

// Reject order assignment
router.post('/orders/:orderId/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;

    await partnerAssignment.handleRejection(
      req.user.userId,
      req.params.orderId,
      reason || 'No reason provided'
    );

    res.json({
      success: true,
      message: 'Order rejected'
    });
  } catch (error) {
    next(error);
  }
});

// Get earnings summary
router.get('/earnings', async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.user.userId);

    res.json({
      success: true,
      data: partner.earnings
    });
  } catch (error) {
    next(error);
  }
});

// Get partner statistics
router.get('/stats', async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.user.userId);

    res.json({
      success: true,
      data: {
        stats: partner.stats,
        rating: partner.rating,
        ratingBreakdown: partner.ratingBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
