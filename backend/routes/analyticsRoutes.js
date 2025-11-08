const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication and agent/admin role
router.use(authenticate);
router.use(authorize('agent', 'admin'));

// Get dashboard statistics
router.get('/dashboard', AnalyticsController.getDashboard);

// Get backlog counts
router.get('/backlog', AnalyticsController.getBacklog);

// Get SLA breaches
router.get('/sla-breaches', AnalyticsController.getSlaBreaches);

// Get agent productivity
router.get('/agent-productivity', AnalyticsController.getAgentProductivity);

// Get ticket trends
router.get('/trends', AnalyticsController.getTicketTrends);

module.exports = router;
