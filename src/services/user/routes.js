const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, authorize } = require('../../middleware/auth');

// Public routes
router.post('/register', controller.register);
router.post('/login', controller.login);

// Protected routes
router.use(authenticate);

router.get('/profile', controller.getProfile);
router.put('/profile', controller.updateProfile);
router.post('/addresses', controller.addAddress);
router.put('/addresses/:addressId', controller.updateAddress);
router.delete('/addresses/:addressId', controller.deleteAddress);
router.post('/logout', controller.logout);

// Admin only routes
router.get('/', authorize('admin'), controller.getAllUsers);
router.get('/:userId', authorize('admin'), controller.getUserById);
router.put('/:userId/status', authorize('admin'), controller.updateUserStatus);

module.exports = router;
