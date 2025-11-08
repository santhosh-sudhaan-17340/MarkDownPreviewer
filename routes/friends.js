const express = require('express');
const router = express.Router();
const passport = require('passport');
const friendsController = require('../controllers/friends_controller');

router.post('/send-request/:id', passport.checkAuthentication, friendsController.sendRequest);
router.post('/accept-request/:id', passport.checkAuthentication, friendsController.acceptRequest);
router.post('/reject-request/:id', passport.checkAuthentication, friendsController.rejectRequest);
router.post('/remove-friend/:id', passport.checkAuthentication, friendsController.removeFriend);
router.get('/suggestions', passport.checkAuthentication, friendsController.suggestions);

module.exports = router;
