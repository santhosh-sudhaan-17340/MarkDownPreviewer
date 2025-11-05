const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  favoriteProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Compound index to prevent duplicate favorites
favoriteSchema.index({ user: 1, favoriteProfile: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
