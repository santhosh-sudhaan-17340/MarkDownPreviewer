const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/favorites
// @desc    Add profile to favorites
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { profileId, notes } = req.body;

    // Check if profile exists
    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Cannot favorite self
    if (profileId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add yourself to favorites'
      });
    }

    // Check if already favorited
    const existing = await Favorite.findOne({
      user: req.user.id,
      favoriteProfile: profileId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Profile already in favorites'
      });
    }

    const favorite = await Favorite.create({
      user: req.user.id,
      favoriteProfile: profileId,
      notes: notes || ''
    });

    await favorite.populate('favoriteProfile', 'firstName lastName profilePhoto age occupation education city gotra');

    res.status(201).json({
      success: true,
      message: 'Added to favorites',
      favorite
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

// @route   GET /api/favorites
// @desc    Get all favorites
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .populate('favoriteProfile', 'firstName lastName profilePhoto age occupation education city state gotra maritalStatus height')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: favorites.length,
      favorites
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

// @route   PUT /api/favorites/:id
// @desc    Update favorite notes
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    favorite.notes = req.body.notes || '';
    await favorite.save();

    res.json({
      success: true,
      message: 'Notes updated',
      favorite
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

// @route   DELETE /api/favorites/:id
// @desc    Remove from favorites
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    await favorite.deleteOne();

    res.json({
      success: true,
      message: 'Removed from favorites'
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
