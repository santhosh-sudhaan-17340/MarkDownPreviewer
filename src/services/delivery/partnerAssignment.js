const DeliveryPartner = require('../../database/mongodb/models/DeliveryPartner');
const { findNearestPartners, calculateDistance, estimateDeliveryTime } = require('../../utils/geoUtils');
const { publisher } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Advanced delivery partner assignment algorithm
 * Considers: distance, rating, availability, load balancing, and performance metrics
 */
class PartnerAssignmentEngine {
  constructor() {
    this.MAX_SEARCH_RADIUS_KM = 10;
    this.MIN_PARTNER_RATING = 3.0;
    this.DISTANCE_WEIGHT = 0.4;
    this.RATING_WEIGHT = 0.3;
    this.PERFORMANCE_WEIGHT = 0.3;
  }

  /**
   * Find and assign the best delivery partner for an order
   */
  async assignPartner(order) {
    try {
      logger.info(`Starting partner assignment for order ${order.order_number}`);

      const { restaurantAddress } = order;

      // Step 1: Find available partners within radius
      const availablePartners = await this.findAvailablePartners(
        restaurantAddress.latitude,
        restaurantAddress.longitude
      );

      if (availablePartners.length === 0) {
        logger.warn(`No available partners found for order ${order.order_number}`);
        return null;
      }

      // Step 2: Score and rank partners
      const scoredPartners = this.scorePartners(
        availablePartners,
        restaurantAddress.latitude,
        restaurantAddress.longitude
      );

      // Step 3: Select best partner
      const bestPartner = scoredPartners[0];

      logger.info(`Assigned partner ${bestPartner._id} to order ${order.order_number} with score ${bestPartner.score}`);

      // Step 4: Update partner status
      await this.updatePartnerStatus(bestPartner._id, 'busy', order.id);

      // Step 5: Notify partner via Redis pub/sub
      await publisher.publish('partner:assignment', JSON.stringify({
        partnerId: bestPartner._id,
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantAddress: order.restaurantAddress,
        deliveryAddress: order.deliveryAddress,
        timestamp: new Date()
      }));

      return bestPartner;
    } catch (error) {
      logger.error('Partner assignment error:', error);
      throw error;
    }
  }

  /**
   * Find all available partners within search radius
   */
  async findAvailablePartners(restaurantLat, restaurantLon) {
    // Get all available partners
    const partners = await DeliveryPartner.find({
      status: 'available',
      isActive: true,
      isVerified: true,
      isOnline: true,
      rating: { $gte: this.MIN_PARTNER_RATING }
    }).lean();

    // Filter by distance
    const nearbyPartners = findNearestPartners(
      partners,
      restaurantLat,
      restaurantLon,
      this.MAX_SEARCH_RADIUS_KM
    );

    return nearbyPartners;
  }

  /**
   * Score partners based on multiple factors
   */
  scorePartners(partners, restaurantLat, restaurantLon) {
    const scored = partners.map(partner => {
      // Distance score (closer is better, normalized to 0-1)
      const distanceScore = 1 - (partner.distance / this.MAX_SEARCH_RADIUS_KM);

      // Rating score (normalized to 0-1)
      const ratingScore = partner.rating / 5;

      // Performance score based on completion rate and on-time delivery
      const performanceScore = (
        (partner.stats.completionRate / 100) * 0.6 +
        (partner.stats.onTimeRate / 100) * 0.4
      );

      // Weighted total score
      const totalScore = (
        distanceScore * this.DISTANCE_WEIGHT +
        ratingScore * this.RATING_WEIGHT +
        performanceScore * this.PERFORMANCE_WEIGHT
      );

      return {
        ...partner,
        scores: {
          distance: distanceScore,
          rating: ratingScore,
          performance: performanceScore,
          total: totalScore
        },
        score: totalScore
      };
    });

    // Sort by total score (descending)
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Update partner status when assigned
   */
  async updatePartnerStatus(partnerId, status, orderId) {
    await DeliveryPartner.findByIdAndUpdate(partnerId, {
      status,
      'currentOrder.orderId': orderId,
      'currentOrder.status': 'assigned',
      'currentOrder.assignedAt': new Date()
    });
  }

  /**
   * Release partner after delivery completion
   */
  async releasePartner(partnerId, updateStats = {}) {
    const partner = await DeliveryPartner.findById(partnerId);

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Update stats if provided
    if (updateStats.deliveryCompleted) {
      partner.stats.totalDeliveries += 1;
      partner.stats.totalEarnings += updateStats.earnings || 0;
      partner.stats.totalDistance += updateStats.distance || 0;

      if (updateStats.wasOnTime) {
        const totalOnTime = (partner.stats.onTimeRate * partner.stats.totalDeliveries / 100);
        partner.stats.onTimeRate = ((totalOnTime + 1) / partner.stats.totalDeliveries) * 100;
      }

      // Update completion rate
      const completions = partner.stats.completionRate * (partner.stats.totalDeliveries - 1) / 100;
      partner.stats.completionRate = ((completions + 1) / partner.stats.totalDeliveries) * 100;
    }

    // Reset status
    partner.status = 'available';
    partner.currentOrder = {};
    partner.lastActive = new Date();

    await partner.save();

    // Notify via pub/sub
    await publisher.publish('partner:available', JSON.stringify({
      partnerId: partner._id,
      timestamp: new Date()
    }));

    return partner;
  }

  /**
   * Handle partner rejection and reassign
   */
  async handleRejection(partnerId, orderId, reason) {
    logger.info(`Partner ${partnerId} rejected order ${orderId}: ${reason}`);

    // Update partner status
    await DeliveryPartner.findByIdAndUpdate(partnerId, {
      status: 'available',
      currentOrder: {}
    });

    // Optionally track rejection count
    await DeliveryPartner.findByIdAndUpdate(partnerId, {
      $inc: { 'stats.rejectionCount': 1 }
    });

    // Trigger reassignment (handled by order service)
    await publisher.publish('order:reassignment_needed', JSON.stringify({
      orderId,
      previousPartnerId: partnerId,
      reason,
      timestamp: new Date()
    }));
  }

  /**
   * Get partner availability statistics
   */
  async getAvailabilityStats(latitude, longitude, radiusKm = 10) {
    const partners = await DeliveryPartner.find({
      isActive: true,
      isOnline: true
    });

    const nearby = findNearestPartners(partners, latitude, longitude, radiusKm);

    const stats = {
      total: nearby.length,
      available: nearby.filter(p => p.status === 'available').length,
      busy: nearby.filter(p => p.status === 'busy').length,
      onDelivery: nearby.filter(p => p.status === 'on_delivery').length,
      averageDistance: nearby.reduce((sum, p) => sum + p.distance, 0) / nearby.length || 0,
      averageRating: nearby.reduce((sum, p) => sum + p.rating, 0) / nearby.length || 0
    };

    return stats;
  }
}

module.exports = new PartnerAssignmentEngine();
