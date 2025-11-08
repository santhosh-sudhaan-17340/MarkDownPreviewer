const express = require('express');
const router = express.Router();
const passport = require('passport');
const messagesController = require('../controllers/messages_controller');

router.get('/', passport.checkAuthentication, messagesController.index);
router.get('/conversation/:userId', passport.checkAuthentication, messagesController.conversation);
router.post('/send', passport.checkAuthentication, messagesController.send);

module.exports = router;
