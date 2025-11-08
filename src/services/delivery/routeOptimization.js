const { calculateDistance, optimizeRoute, estimateDeliveryTime } = require('../../utils/geoUtils');
const logger = require('../../utils/logger');

/**
 * Route optimization engine for delivery planning
 * Implements algorithms for single and multi-drop deliveries
 */
class RouteOptimizationEngine {
  constructor() {
    this.AVERAGE_SPEED_KMH = parseFloat(process.env.AVERAGE_SPEED_KMH) || 30;
    this.TRAFFIC_MULTIPLIERS = {
      low: 1.0,
      moderate: 1.3,
      high: 1.6,
      veryHigh: 2.0
    };
  }

  /**
   * Calculate optimal route for single delivery
   */
  calculateSingleDeliveryRoute(restaurantLocation, deliveryLocation, options = {}) {
    const { trafficLevel = 'moderate', includeReturn = false } = options;

    const distance = calculateDistance(
      restaurantLocation.latitude,
      restaurantLocation.longitude,
      deliveryLocation.latitude,
      deliveryLocation.longitude
    );

    const trafficMultiplier = this.TRAFFIC_MULTIPLIERS[trafficLevel] || 1.3;
    const adjustedSpeed = this.AVERAGE_SPEED_KMH / trafficMultiplier;

    const travelTimeMinutes = (distance / adjustedSpeed) * 60;
    const estimatedTime = Math.ceil(travelTimeMinutes);

    const route = {
      type: 'single_delivery',
      waypoints: [
        {
          type: 'pickup',
          location: restaurantLocation,
          address: restaurantLocation.address,
          estimatedArrival: new Date(Date.now() + 5 * 60000) // 5 min to pickup
        },
        {
          type: 'delivery',
          location: deliveryLocation,
          address: deliveryLocation.address,
          estimatedArrival: new Date(Date.now() + (5 + estimatedTime) * 60000)
        }
      ],
      distance: {
        total: includeReturn ? distance * 2 : distance,
        toRestaurant: 0, // Assuming partner starts from restaurant
        toDelivery: distance,
        unit: 'km'
      },
      duration: {
        total: estimatedTime,
        toPickup: 5,
        toDelivery: estimatedTime,
        unit: 'minutes'
      },
      trafficConditions: trafficLevel,
      optimizationScore: 1.0 // Perfect score for single delivery
    };

    return route;
  }

  /**
   * Optimize route for multiple deliveries (batch delivery)
   */
  optimizeBatchDeliveryRoute(startLocation, deliveryPoints, options = {}) {
    const { trafficLevel = 'moderate', maxDeliveries = 5 } = options;

    // Limit number of deliveries
    const limitedDeliveries = deliveryPoints.slice(0, maxDeliveries);

    // Use nearest neighbor algorithm for route optimization
    const optimizedStops = optimizeRoute(startLocation, limitedDeliveries);

    let cumulativeDistance = 0;
    let cumulativeTime = 0;
    const waypoints = [];

    // Add start point
    waypoints.push({
      type: 'start',
      location: startLocation,
      estimatedArrival: new Date()
    });

    // Calculate route through optimized stops
    let previousLocation = startLocation;

    optimizedStops.forEach((stop, index) => {
      const segmentDistance = stop.distanceFromPrevious;
      cumulativeDistance += segmentDistance;

      const trafficMultiplier = this.TRAFFIC_MULTIPLIERS[trafficLevel] || 1.3;
      const adjustedSpeed = this.AVERAGE_SPEED_KMH / trafficMultiplier;
      const segmentTime = (segmentDistance / adjustedSpeed) * 60;

      // Add 5 minutes for each stop (delivery time)
      cumulativeTime += segmentTime + 5;

      waypoints.push({
        type: 'delivery',
        orderNumber: stop.orderNumber,
        location: {
          latitude: stop.latitude,
          longitude: stop.longitude
        },
        address: stop.address,
        estimatedArrival: new Date(Date.now() + cumulativeTime * 60000),
        distanceFromPrevious: segmentDistance,
        timeFromPrevious: Math.ceil(segmentTime)
      });

      previousLocation = stop;
    });

    const route = {
      type: 'batch_delivery',
      deliveryCount: optimizedStops.length,
      waypoints,
      distance: {
        total: cumulativeDistance,
        unit: 'km'
      },
      duration: {
        total: Math.ceil(cumulativeTime),
        unit: 'minutes'
      },
      trafficConditions: trafficLevel,
      optimizationScore: this.calculateOptimizationScore(optimizedStops, cumulativeDistance)
    };

    return route;
  }

  /**
   * Calculate optimization score (how efficient the route is)
   * Score closer to 1.0 means highly optimized
   */
  calculateOptimizationScore(stops, actualDistance) {
    if (stops.length === 0) return 1.0;

    // Calculate ideal distance (if we could teleport in straight line)
    const idealDistance = stops.reduce((sum, stop) => sum + stop.distanceFromPrevious, 0);

    // Score is ratio of ideal to actual (penalized by detours)
    const score = Math.max(0.5, Math.min(1.0, idealDistance / (actualDistance * 1.2)));

    return parseFloat(score.toFixed(2));
  }

  /**
   * Estimate delivery time with traffic and preparation time
   */
  estimateCompleteDeliveryTime(restaurantLocation, deliveryLocation, options = {}) {
    const {
      preparationTime = 20,
      trafficLevel = 'moderate',
      partnerDistance = 0
    } = options;

    const route = this.calculateSingleDeliveryRoute(restaurantLocation, deliveryLocation, {
      trafficLevel
    });

    // Partner travel to restaurant
    const partnerToRestaurantTime = partnerDistance > 0
      ? (partnerDistance / this.AVERAGE_SPEED_KMH) * 60
      : 0;

    const totalTime = Math.ceil(
      partnerToRestaurantTime +
      preparationTime +
      route.duration.toDelivery
    );

    return {
      totalMinutes: totalTime,
      breakdown: {
        partnerToRestaurant: Math.ceil(partnerToRestaurantTime),
        preparation: preparationTime,
        delivery: route.duration.toDelivery
      },
      estimatedDeliveryTime: new Date(Date.now() + totalTime * 60000)
    };
  }

  /**
   * Check if delivery is feasible based on distance and time
   */
  checkDeliveryFeasibility(restaurantLocation, deliveryLocation, options = {}) {
    const {
      maxDistance = 20, // km
      maxTime = 60, // minutes
      currentOrders = 0,
      maxConcurrentOrders = 3
    } = options;

    const distance = calculateDistance(
      restaurantLocation.latitude,
      restaurantLocation.longitude,
      deliveryLocation.latitude,
      deliveryLocation.longitude
    );

    const route = this.calculateSingleDeliveryRoute(restaurantLocation, deliveryLocation);

    const feasibility = {
      isFeasible: true,
      issues: [],
      warnings: [],
      distance,
      estimatedTime: route.duration.total
    };

    // Check distance constraint
    if (distance > maxDistance) {
      feasibility.isFeasible = false;
      feasibility.issues.push(`Distance ${distance.toFixed(2)}km exceeds maximum ${maxDistance}km`);
    }

    // Check time constraint
    if (route.duration.total > maxTime) {
      feasibility.isFeasible = false;
      feasibility.issues.push(`Estimated time ${route.duration.total}min exceeds maximum ${maxTime}min`);
    }

    // Check partner capacity
    if (currentOrders >= maxConcurrentOrders) {
      feasibility.isFeasible = false;
      feasibility.issues.push('Partner at maximum capacity');
    }

    // Add warnings for borderline cases
    if (distance > maxDistance * 0.8) {
      feasibility.warnings.push('Delivery distance is near maximum limit');
    }

    if (route.duration.total > maxTime * 0.8) {
      feasibility.warnings.push('Delivery time is near maximum limit');
    }

    return feasibility;
  }

  /**
   * Calculate delivery zones based on restaurant location
   */
  calculateDeliveryZones(restaurantLocation) {
    const zones = [
      { name: 'Zone 1 - Priority', radius: 3, deliveryFee: 20, estimatedTime: 20 },
      { name: 'Zone 2 - Standard', radius: 7, deliveryFee: 40, estimatedTime: 35 },
      { name: 'Zone 3 - Extended', radius: 15, deliveryFee: 60, estimatedTime: 50 }
    ];

    return zones.map(zone => ({
      ...zone,
      center: restaurantLocation,
      coverage: {
        area: Math.PI * zone.radius * zone.radius,
        unit: 'km²'
      }
    }));
  }

  /**
   * Get real-time traffic level (mock implementation)
   * In production, this would integrate with Google Maps Traffic API or similar
   */
  async getCurrentTrafficLevel(lat1, lon1, lat2, lon2) {
    // Mock implementation - would call actual traffic API
    const hour = new Date().getHours();

    if (hour >= 8 && hour <= 10 || hour >= 17 && hour <= 20) {
      return 'high'; // Peak hours
    } else if (hour >= 11 && hour <= 16) {
      return 'moderate'; // Moderate traffic
    } else {
      return 'low'; // Off-peak
    }
  }
}

module.exports = new RouteOptimizationEngine();
