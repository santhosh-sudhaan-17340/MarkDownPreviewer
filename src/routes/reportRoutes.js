const express = require('express');
const router = express.Router();
const ReportingController = require('../controllers/ReportingController');

router.get('/dashboard', ReportingController.getDashboard);
router.get('/backlog', ReportingController.getBacklog);
router.get('/sla-breaches', ReportingController.getSLABreaches);
router.get('/agent-productivity', ReportingController.getAgentProductivity);
router.get('/sla-statistics', ReportingController.getSLAStatistics);
router.get('/attachment-stats', ReportingController.getAttachmentStats);

module.exports = router;
