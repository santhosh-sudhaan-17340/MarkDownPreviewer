const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: 500
  },
  responseMessage: String,
  respondedAt: Date
}, {
  timestamps: true
});

// Compound index to prevent duplicate interests
interestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('Interest', interestSchema);
