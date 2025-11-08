const User = require('../models/User');
const Review = require('../models/Review');

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Public
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const updates = {
      name: req.body.name,
      bio: req.body.bio,
      profileImage: req.body.profileImage,
      availability: req.body.availability
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add skill offered
// @route   POST /api/users/skills/offered
// @access  Private
exports.addSkillOffered = async (req, res) => {
  try {
    const { name, category, level, description, hoursAvailable } = req.body;

    const user = await User.findById(req.user._id);
    user.skillsOffered.push({
      name,
      category,
      level,
      description,
      hoursAvailable
    });

    await user.save();

    res.json({
      success: true,
      data: user.skillsOffered
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add skill wanted
// @route   POST /api/users/skills/wanted
// @access  Private
exports.addSkillWanted = async (req, res) => {
  try {
    const { name, category, level } = req.body;

    const user = await User.findById(req.user._id);
    user.skillsWanted.push({ name, category, level });

    await user.save();

    res.json({
      success: true,
      data: user.skillsWanted
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove skill
// @route   DELETE /api/users/skills/:type/:skillId
// @access  Private
exports.removeSkill = async (req, res) => {
  try {
    const { type, skillId } = req.params;
    const user = await User.findById(req.user._id);

    if (type === 'offered') {
      user.skillsOffered.id(skillId).remove();
    } else if (type === 'wanted') {
      user.skillsWanted.id(skillId).remove();
    }

    await user.save();

    res.json({
      success: true,
      data: type === 'offered' ? user.skillsOffered : user.skillsWanted
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user reviews
// @route   GET /api/users/:id/reviews
// @access  Public
exports.getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      reviewee: req.params.id,
      isPublic: true
    })
    .populate('reviewer', 'name profileImage')
    .sort({ createdAt: -1 })
    .limit(20);

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
