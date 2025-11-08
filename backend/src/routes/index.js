/**
 * Main API Routes
 */

const express = require('express');
const router = express.Router();

const subscriptionRoutes = require('./subscriptions');
const invoiceRoutes = require('./invoices');
const paymentRoutes = require('./payments');
const couponRoutes = require('./coupons');
const taxRoutes = require('./taxes');
const analyticsRoutes = require('./analytics');
const adminRoutes = require('./admin');

// API version prefix
router.use('/subscriptions', subscriptionRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/coupons', couponRoutes);
router.use('/taxes', taxRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

module.exports = router;
