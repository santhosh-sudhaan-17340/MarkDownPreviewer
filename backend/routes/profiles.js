const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/profiles/search
// @desc    Search profiles with filters
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const {
      gender,
      ageFrom,
      ageTo,
      heightFrom,
      heightTo,
      maritalStatus,
      education,
      occupation,
      city,
      state,
      gotra,
      diet,
      page = 1,
      limit = 20
    } = req.query;

    const query = {
      _id: { $ne: req.user.id },
      active: true,
      profileCompleted: true
    };

    // Gender filter (opposite to logged in user for matches)
    if (gender) {
      query.gender = gender;
    } else {
      query.gender = req.user.gender === 'Male' ? 'Female' : 'Male';
    }

    // Age filter
    if (ageFrom || ageTo) {
      const today = new Date();
      if (ageTo) {
        const minDate = new Date(today.getFullYear() - parseInt(ageTo) - 1, today.getMonth(), today.getDate());
        query.dateOfBirth = { $gte: minDate };
      }
      if (ageFrom) {
        const maxDate = new Date(today.getFullYear() - parseInt(ageFrom), today.getMonth(), today.getDate());
        query.dateOfBirth = { ...query.dateOfBirth, $lte: maxDate };
      }
    }

    // Height filter
    if (heightFrom) query.height = { $gte: parseInt(heightFrom) };
    if (heightTo) query.height = { ...query.height, $lte: parseInt(heightTo) };

    // Other filters
    if (maritalStatus) query.maritalStatus = maritalStatus;
    if (education) query.education = new RegExp(education, 'i');
    if (occupation) query.occupation = new RegExp(occupation, 'i');
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (state) query['address.state'] = new RegExp(state, 'i');
    if (gotra) query.gotra = new RegExp(gotra, 'i');
    if (diet) query.diet = diet;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const profiles = await User.find(query)
      .select('-password -email -phone -alternatePhone')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: profiles.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      profiles
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

// @route   GET /api/profiles/recommendations
// @desc    Get profile recommendations based on preferences
// @access  Private
router.get('/recommendations', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const prefs = user.partnerPreferences || {};

    const query = {
      _id: { $ne: req.user.id },
      active: true,
      profileCompleted: true,
      gender: req.user.gender === 'Male' ? 'Female' : 'Male'
    };

    // Apply preferences
    if (prefs.ageFrom || prefs.ageTo) {
      const today = new Date();
      if (prefs.ageTo) {
        const minDate = new Date(today.getFullYear() - prefs.ageTo - 1, today.getMonth(), today.getDate());
        query.dateOfBirth = { $gte: minDate };
      }
      if (prefs.ageFrom) {
        const maxDate = new Date(today.getFullYear() - prefs.ageFrom, today.getMonth(), today.getDate());
        query.dateOfBirth = { ...query.dateOfBirth, $lte: maxDate };
      }
    }

    if (prefs.heightFrom) query.height = { $gte: prefs.heightFrom };
    if (prefs.heightTo) query.height = { ...query.height, $lte: prefs.heightTo };
    if (prefs.maritalStatus && prefs.maritalStatus.length > 0) {
      query.maritalStatus = { $in: prefs.maritalStatus };
    }
    if (prefs.gotra && prefs.gotra.length > 0) {
      query.gotra = { $in: prefs.gotra };
    }

    const profiles = await User.find(query)
      .select('-password -email -phone -alternatePhone')
      .limit(20)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: profiles.length,
      profiles
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

// @route   GET /api/profiles/:id
// @desc    Get profile by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const profile = await User.findOne({
      _id: req.params.id,
      active: true
    }).select('-password');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Increment profile views (only if not viewing own profile)
    if (req.user.id !== req.params.id) {
      profile.profileViews += 1;
      await profile.save();
    }

    // Respect privacy settings
    const profileData = profile.toObject();
    if (!profile.privacySettings.showPhone && req.user.id !== req.params.id) {
      delete profileData.phone;
      delete profileData.alternatePhone;
      delete profileData.email;
    }

    res.json({
      success: true,
      profile: profileData
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

// @route   PUT /api/profiles/me
// @desc    Update own profile
// @access  Private
router.put('/me', protect, async (req, res) => {
  try {
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'alternatePhone', 'address',
      'height', 'weight', 'complexion', 'bloodGroup', 'physicalStatus',
      'education', 'educationDetails', 'occupation', 'occupationDetails',
      'annualIncome', 'gotra', 'kuldevta', 'nativePlace', 'manglik',
      'birthTime', 'birthPlace', 'rashi', 'nakshatra',
      'familyType', 'familyValues', 'fatherName', 'fatherOccupation',
      'motherName', 'motherOccupation', 'brothers', 'sisters', 'familyIncome',
      'diet', 'smoking', 'drinking', 'aboutMe', 'hobbies', 'partnerPreferences',
      'privacySettings', 'maritalStatus', 'profileFor'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    // Check if profile is completed
    const requiredFields = ['firstName', 'lastName', 'phone', 'gender', 'dateOfBirth',
                           'height', 'education', 'occupation', 'gotra', 'maritalStatus'];
    const isCompleted = requiredFields.every(field => user[field]);

    if (isCompleted && !user.profileCompleted) {
      user.profileCompleted = true;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
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

// @route   POST /api/profiles/upload-photo
// @desc    Upload profile photo
// @access  Private
router.post('/upload-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    const isProfile = req.body.isProfile === 'true';

    const user = await User.findById(req.user.id);

    // Add to photos array
    user.photos.push({
      url: photoUrl,
      isProfile: isProfile
    });

    // Set as profile photo if specified
    if (isProfile) {
      user.profilePhoto = photoUrl;
      // Mark other photos as not profile
      user.photos.forEach(photo => {
        if (photo.url !== photoUrl) {
          photo.isProfile = false;
        }
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      photo: {
        url: photoUrl,
        isProfile: isProfile
      }
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

// @route   DELETE /api/profiles/photo/:photoUrl
// @desc    Delete profile photo
// @access  Private
router.delete('/photo', protect, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const user = await User.findById(req.user.id);

    user.photos = user.photos.filter(photo => photo.url !== photoUrl);

    if (user.profilePhoto === photoUrl) {
      user.profilePhoto = user.photos.length > 0 ? user.photos[0].url : '';
    }

    await user.save();

    // Delete physical file (optional)
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', photoUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: 'Photo deleted successfully'
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
