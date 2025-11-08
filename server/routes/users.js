const express = require('express');
const {
  getUserProfile,
  updateProfile,
  addSkillOffered,
  addSkillWanted,
  removeSkill,
  getUserReviews
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', getUserProfile);
router.put('/profile', protect, updateProfile);
router.post('/skills/offered', protect, addSkillOffered);
router.post('/skills/wanted', protect, addSkillWanted);
router.delete('/skills/:type/:skillId', protect, removeSkill);
router.get('/:id/reviews', getUserReviews);

module.exports = router;
