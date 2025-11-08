const express = require('express');
const router = express.Router();
const partnerAssignment = require('./partnerAssignment');
const routeOptimization = require('./routeOptimization');
const { authenticate } = require('../../middleware/auth');

// Get partner availability stats
router.get('/availability', async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const stats = await partnerAssignment.getAvailabilityStats(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Calculate delivery route
router.post('/route/calculate', async (req, res, next) => {
  try {
    const { restaurantLocation, deliveryLocation, trafficLevel } = req.body;

    const route = routeOptimization.calculateSingleDeliveryRoute(
      restaurantLocation,
      deliveryLocation,
      { trafficLevel }
    );

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    next(error);
  }
});

// Check delivery feasibility
router.post('/feasibility', async (req, res, next) => {
  try {
    const { restaurantLocation, deliveryLocation, options } = req.body;

    const feasibility = routeOptimization.checkDeliveryFeasibility(
      restaurantLocation,
      deliveryLocation,
      options
    );

    res.json({
      success: true,
      data: feasibility
    });
  } catch (error) {
    next(error);
  }
});

// Get delivery zones for a restaurant
router.post('/zones', async (req, res, next) => {
  try {
    const { restaurantLocation } = req.body;

    const zones = routeOptimization.calculateDeliveryZones(restaurantLocation);

    res.json({
      success: true,
      data: zones
    });
  } catch (error) {
    next(error);
  }
});

// Estimate complete delivery time
router.post('/estimate', async (req, res, next) => {
  try {
    const { restaurantLocation, deliveryLocation, options } = req.body;

    const estimate = routeOptimization.estimateCompleteDeliveryTime(
      restaurantLocation,
      deliveryLocation,
      options
    );

    res.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
