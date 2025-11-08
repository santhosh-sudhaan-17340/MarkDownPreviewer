const express = require('express');
const router = express.Router();
const fraudDetector = require('./fraudDetector');
const { authenticate, authorize } = require('../../middleware/auth');

// Analyze order for fraud (internal service call)
router.post('/analyze/order', async (req, res, next) => {
  try {
    const order = req.body;
    const analysis = await fraudDetector.analyzeOrder(order);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
});

// Analyze user registration for fraud
router.post('/analyze/user', async (req, res, next) => {
  try {
    const userData = req.body;
    const analysis = await fraudDetector.analyzeUserRegistration(userData);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
});

// Get fraud logs (admin only)
router.get('/logs', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, riskLevel } = req.query;

    const { sequelize } = require('../../config/database');

    let query = 'SELECT * FROM fraud_logs';
    const replacements = {};

    if (riskLevel) {
      query += ' WHERE risk_level = :riskLevel';
      replacements.riskLevel = riskLevel;
    }

    query += ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
    replacements.limit = parseInt(limit);
    replacements.offset = (page - 1) * limit;

    const logs = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
