const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  skillRating: {
    type: Number,
    min: 1,
    max: 5
  },
  communicationRating: {
    type: Number,
    min: 1,
    max: 5
  },
  punctualityRating: {
    type: Number,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  tags: [{
    type: String,
    enum: ['helpful', 'knowledgeable', 'patient', 'prepared', 'professional', 'friendly', 'clear-communicator']
  }],
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure one review per user per session
reviewSchema.index({ session: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
