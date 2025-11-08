const express = require('express');
const {
  createReview,
  getSessionReviews,
  getUserReviews
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createReview);
router.get('/session/:sessionId', protect, getSessionReviews);
router.get('/user/:userId', getUserReviews);

module.exports = router;
