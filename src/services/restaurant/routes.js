const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, authorize } = require('../../middleware/auth');

// Public routes
router.get('/', controller.searchRestaurants);
router.get('/nearby', controller.getNearbyRestaurants);
router.get('/:restaurantId', controller.getRestaurantById);
router.get('/:restaurantId/menu', controller.getMenu);

// Protected routes (restaurant owners)
router.use(authenticate);

router.post('/', controller.createRestaurant);
router.put('/:restaurantId', controller.updateRestaurant);
router.put('/:restaurantId/status', controller.updateStatus);

// Menu management
router.post('/:restaurantId/menu', controller.addMenuItem);
router.put('/:restaurantId/menu/:itemId', controller.updateMenuItem);
router.delete('/:restaurantId/menu/:itemId', controller.deleteMenuItem);
router.put('/:restaurantId/menu/:itemId/availability', controller.updateMenuItemAvailability);

// Admin routes
router.put('/:restaurantId/verify', authorize('admin'), controller.verifyRestaurant);
router.delete('/:restaurantId', authorize('admin'), controller.deleteRestaurant);

module.exports = router;
