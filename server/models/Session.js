const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  learner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skill: {
    type: String,
    required: true
  },
  scheduledStart: {
    type: Date,
    required: true
  },
  scheduledEnd: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  creditsLocked: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'disputed'],
    default: 'scheduled'
  },
  actualStart: Date,
  actualEnd: Date,
  videoRoomId: {
    type: String,
    unique: true,
    sparse: true
  },
  notes: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String
}, {
  timestamps: true
});

// Index for queries
sessionSchema.index({ teacher: 1, scheduledStart: 1 });
sessionSchema.index({ learner: 1, scheduledStart: 1 });
sessionSchema.index({ status: 1, scheduledStart: 1 });

module.exports = mongoose.model('Session', sessionSchema);
