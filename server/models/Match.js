const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  user1: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    skillOffered: {
      type: String,
      required: true
    },
    skillWanted: {
      type: String,
      required: true
    }
  },
  user2: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    skillOffered: {
      type: String,
      required: true
    },
    skillWanted: {
      type: String,
      required: true
    }
  },
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  acceptedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7*24*60*60*1000) // 7 days
  }
}, {
  timestamps: true
});

// Index for faster queries
matchSchema.index({ 'user1.userId': 1, 'user2.userId': 1 });
matchSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Match', matchSchema);
