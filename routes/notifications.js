const express = require('express');
const router = express.Router();
const passport = require('passport');
const notificationsController = require('../controllers/notifications_controller');

router.get('/', passport.checkAuthentication, notificationsController.index);
router.post('/mark-read/:id', passport.checkAuthentication, notificationsController.markRead);
router.post('/mark-all-read', passport.checkAuthentication, notificationsController.markAllRead);

module.exports = router;
