const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['escrow', 'release', 'refund', 'bonus', 'penalty'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending'
  },
  description: String,
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index for transaction history
transactionSchema.index({ from: 1, createdAt: -1 });
transactionSchema.index({ to: 1, createdAt: -1 });
transactionSchema.index({ session: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
