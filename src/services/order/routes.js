const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');

// All order routes require authentication
router.use(authenticate);

// Create new order
router.post('/', controller.createOrder);

// Get user's orders
router.get('/my-orders', controller.getMyOrders);

// Get order by ID
router.get('/:orderId', controller.getOrderById);

// Cancel order
router.put('/:orderId/cancel', controller.cancelOrder);

// Update order status (for partners/restaurants)
router.put('/:orderId/status', controller.updateOrderStatus);

// Rate order
router.post('/:orderId/rate', controller.rateOrder);

// Track order
router.get('/:orderId/track', controller.trackOrder);

module.exports = router;
