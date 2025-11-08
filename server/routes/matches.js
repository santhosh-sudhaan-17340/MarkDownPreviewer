const express = require('express');
const {
  findMatches,
  getMatches,
  acceptMatch,
  declineMatch
} = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/find', protect, findMatches);
router.get('/', protect, getMatches);
router.put('/:id/accept', protect, acceptMatch);
router.put('/:id/decline', protect, declineMatch);

module.exports = router;
