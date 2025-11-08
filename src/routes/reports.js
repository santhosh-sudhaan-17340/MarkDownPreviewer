const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/reportsController');

// Backlog routes
router.get('/backlog/counts', ReportsController.getBacklogCounts);
router.get('/backlog/summary', ReportsController.getBacklogSummary);

// SLA routes
router.get('/sla/breaches', ReportsController.getSLABreaches);
router.get('/sla/breach-stats', ReportsController.getSLABreachStats);
router.get('/sla/metrics', ReportsController.getSLAMetrics);
router.get('/sla/upcoming-deadlines', ReportsController.getUpcomingSLADeadlines);

// Agent routes
router.get('/agents/productivity', ReportsController.getAgentProductivity);
router.get('/agents/workload', ReportsController.getAgentWorkload);

// Category routes
router.get('/categories/tickets', ReportsController.getTicketsByCategory);

// Trend routes
router.get('/trending-issues', ReportsController.getTrendingIssues);
router.get('/daily-volume', ReportsController.getDailyTicketVolume);
router.get('/resolution-time-distribution', ReportsController.getResolutionTimeDistribution);

module.exports = router;
