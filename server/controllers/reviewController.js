const Review = require('../models/Review');
const Session = require('../models/Session');
const User = require('../models/User');
const EscrowService = require('../utils/escrowService');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const {
      sessionId,
      revieweeId,
      rating,
      skillRating,
      communicationRating,
      punctualityRating,
      comment,
      tags
    } = req.body;

    // Check if session exists and is completed
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed sessions'
      });
    }

    // Check if user was part of this session
    if (
      session.teacher.toString() !== req.user._id.toString() &&
      session.learner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      session: sessionId,
      reviewer: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this session'
      });
    }

    // Create review
    const review = await Review.create({
      session: sessionId,
      reviewer: req.user._id,
      reviewee: revieweeId,
      rating,
      skillRating,
      communicationRating,
      punctualityRating,
      comment,
      tags
    });

    // Update reviewee's reputation
    const reviewee = await User.findById(revieweeId);
    reviewee.updateReputation(rating);
    await reviewee.save();

    // Award bonus credit for good reviews (4+ stars)
    if (rating >= 4) {
      await EscrowService.awardBonus(
        revieweeId,
        1,
        `Bonus credit for ${rating}-star review`
      );
    }

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get reviews for a session
// @route   GET /api/reviews/session/:sessionId
// @access  Private
exports.getSessionReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ session: req.params.sessionId })
      .populate('reviewer reviewee', 'name profileImage');

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get reviews by user
// @route   GET /api/reviews/user/:userId
// @access  Public
exports.getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      reviewee: req.params.userId,
      isPublic: true
    })
    .populate('reviewer', 'name profileImage')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
