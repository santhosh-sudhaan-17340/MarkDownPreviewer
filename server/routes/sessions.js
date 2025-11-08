const express = require('express');
const {
  createSession,
  getSessions,
  getSession,
  startSession,
  completeSession,
  cancelSession
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createSession);
router.get('/', protect, getSessions);
router.get('/:id', protect, getSession);
router.put('/:id/start', protect, startSession);
router.put('/:id/complete', protect, completeSession);
router.put('/:id/cancel', protect, cancelSession);

module.exports = router;
