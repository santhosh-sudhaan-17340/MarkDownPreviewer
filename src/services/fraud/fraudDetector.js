const { sequelize } = require('../../config/database');
const { cacheService } = require('../../config/redis');
const logger = require('../../utils/logger');
const { calculateDistance } = require('../../utils/geoUtils');

/**
 * Advanced Fraud Detection Engine
 * Detects suspicious patterns in orders, payments, and user behavior
 */
class FraudDetectionEngine {
  constructor() {
    this.MAX_ORDERS_PER_HOUR = parseInt(process.env.MAX_ORDERS_PER_HOUR) || 10;
    this.MAX_FAILED_PAYMENTS = parseInt(process.env.MAX_FAILED_PAYMENTS) || 3;
    this.SUSPICIOUS_DISTANCE_KM = parseInt(process.env.SUSPICIOUS_DISTANCE_KM) || 50;
    this.RISK_THRESHOLDS = {
      low: 30,
      medium: 50,
      high: 70,
      critical: 90
    };
  }

  /**
   * Initialize fraud detection patterns
   */
  async initialize() {
    logger.info('Initializing fraud detection engine...');
    // Load ML models, pattern databases, etc.
    // This is a placeholder for actual initialization
    logger.info('Fraud detection engine initialized successfully');
  }

  /**
   * Analyze order for fraud indicators
   */
  async analyzeOrder(order) {
    const indicators = [];
    let riskScore = 0;

    try {
      // 1. Check order frequency
      const frequencyCheck = await this.checkOrderFrequency(order.customer_id);
      if (frequencyCheck.isSuspicious) {
        riskScore += 25;
        indicators.push({
          type: 'high_frequency',
          severity: 'high',
          details: frequencyCheck.details
        });
      }

      // 2. Check delivery distance anomaly
      const distanceCheck = this.checkDeliveryDistance(order);
      if (distanceCheck.isSuspicious) {
        riskScore += 15;
        indicators.push({
          type: 'unusual_distance',
          severity: 'medium',
          details: distanceCheck.details
        });
      }

      // 3. Check order value anomaly
      const valueCheck = await this.checkOrderValue(order.customer_id, order.final_amount);
      if (valueCheck.isSuspicious) {
        riskScore += 20;
        indicators.push({
          type: 'unusual_order_value',
          severity: 'medium',
          details: valueCheck.details
        });
      }

      // 4. Check payment history
      const paymentCheck = await this.checkPaymentHistory(order.customer_id);
      if (paymentCheck.isSuspicious) {
        riskScore += 30;
        indicators.push({
          type: 'payment_issues',
          severity: 'high',
          details: paymentCheck.details
        });
      }

      // 5. Check delivery address changes
      const addressCheck = await this.checkAddressPattern(order.customer_id, order.delivery_address);
      if (addressCheck.isSuspicious) {
        riskScore += 15;
        indicators.push({
          type: 'address_anomaly',
          severity: 'medium',
          details: addressCheck.details
        });
      }

      // 6. Check time pattern anomaly
      const timeCheck = this.checkTimePattern(order);
      if (timeCheck.isSuspicious) {
        riskScore += 10;
        indicators.push({
          type: 'unusual_time',
          severity: 'low',
          details: timeCheck.details
        });
      }

      // 7. Check for duplicate orders
      const duplicateCheck = await this.checkDuplicateOrders(order);
      if (duplicateCheck.isSuspicious) {
        riskScore += 40;
        indicators.push({
          type: 'duplicate_order',
          severity: 'critical',
          details: duplicateCheck.details
        });
      }

      // Determine risk level
      const riskLevel = this.calculateRiskLevel(riskScore);

      // Log fraud check
      await this.logFraudCheck('order', order.id, riskScore, riskLevel, indicators);

      return {
        riskScore,
        riskLevel,
        isFraudulent: riskLevel === 'critical',
        requiresReview: riskLevel === 'high' || riskLevel === 'critical',
        indicators,
        recommendation: this.getRecommendation(riskLevel)
      };
    } catch (error) {
      logger.error('Fraud analysis error:', error);
      return {
        riskScore: 0,
        riskLevel: 'unknown',
        isFraudulent: false,
        requiresReview: false,
        indicators: [],
        error: error.message
      };
    }
  }

  /**
   * Check order frequency for velocity attacks
   */
  async checkOrderFrequency(customerId) {
    const cacheKey = `orders:frequency:${customerId}`;
    const recentOrders = await cacheService.get(cacheKey) || [];

    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const ordersInLastHour = recentOrders.filter(time => time > oneHourAgo);

    if (ordersInLastHour.length >= this.MAX_ORDERS_PER_HOUR) {
      return {
        isSuspicious: true,
        details: `${ordersInLastHour.length} orders in the last hour (threshold: ${this.MAX_ORDERS_PER_HOUR})`
      };
    }

    // Update cache
    recentOrders.push(Date.now());
    await cacheService.set(cacheKey, recentOrders, 3600);

    return { isSuspicious: false };
  }

  /**
   * Check if delivery distance is suspiciously large
   */
  checkDeliveryDistance(order) {
    const { restaurantAddress, deliveryAddress } = order;

    const distance = calculateDistance(
      restaurantAddress.latitude,
      restaurantAddress.longitude,
      deliveryAddress.latitude,
      deliveryAddress.longitude
    );

    if (distance > this.SUSPICIOUS_DISTANCE_KM) {
      return {
        isSuspicious: true,
        details: `Delivery distance ${distance.toFixed(2)}km exceeds threshold ${this.SUSPICIOUS_DISTANCE_KM}km`
      };
    }

    return { isSuspicious: false };
  }

  /**
   * Check if order value is anomalous compared to user history
   */
  async checkOrderValue(customerId, currentValue) {
    try {
      const result = await sequelize.query(`
        SELECT
          AVG(final_amount) as avg_order,
          STDDEV(final_amount) as stddev_order,
          MAX(final_amount) as max_order,
          COUNT(*) as total_orders
        FROM orders
        WHERE customer_id = :customerId
        AND created_at > NOW() - INTERVAL '30 days'
      `, {
        replacements: { customerId },
        type: sequelize.QueryTypes.SELECT
      });

      const stats = result[0];

      if (!stats || stats.total_orders < 3) {
        return { isSuspicious: false }; // Not enough history
      }

      const avgOrder = parseFloat(stats.avg_order) || 0;
      const stddevOrder = parseFloat(stats.stddev_order) || 0;

      // Check if current order is more than 3 standard deviations from mean
      if (stddevOrder > 0 && Math.abs(currentValue - avgOrder) > (3 * stddevOrder)) {
        return {
          isSuspicious: true,
          details: `Order value ${currentValue} is ${((currentValue - avgOrder) / stddevOrder).toFixed(2)} std deviations from average ${avgOrder.toFixed(2)}`
        };
      }

      // Check if order is 5x larger than average
      if (currentValue > avgOrder * 5 && avgOrder > 100) {
        return {
          isSuspicious: true,
          details: `Order value ${currentValue} is ${(currentValue / avgOrder).toFixed(2)}x larger than average`
        };
      }

      return { isSuspicious: false };
    } catch (error) {
      logger.error('Order value check error:', error);
      return { isSuspicious: false };
    }
  }

  /**
   * Check payment failure history
   */
  async checkPaymentHistory(customerId) {
    try {
      const result = await sequelize.query(`
        SELECT COUNT(*) as failed_count
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE o.customer_id = :customerId
        AND p.status = 'failed'
        AND p.created_at > NOW() - INTERVAL '7 days'
      `, {
        replacements: { customerId },
        type: sequelize.QueryTypes.SELECT
      });

      const failedCount = parseInt(result[0].failed_count) || 0;

      if (failedCount >= this.MAX_FAILED_PAYMENTS) {
        return {
          isSuspicious: true,
          details: `${failedCount} failed payments in the last 7 days (threshold: ${this.MAX_FAILED_PAYMENTS})`
        };
      }

      return { isSuspicious: false };
    } catch (error) {
      logger.error('Payment history check error:', error);
      return { isSuspicious: false };
    }
  }

  /**
   * Check for address pattern anomalies
   */
  async checkAddressPattern(customerId, currentAddress) {
    try {
      const result = await sequelize.query(`
        SELECT
          delivery_address,
          COUNT(*) as usage_count
        FROM orders
        WHERE customer_id = :customerId
        AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY delivery_address
        ORDER BY usage_count DESC
        LIMIT 5
      `, {
        replacements: { customerId },
        type: sequelize.QueryTypes.SELECT
      });

      if (result.length === 0) {
        return { isSuspicious: false }; // New customer
      }

      // Check if using a completely new address
      const hasUsedAddress = result.some(row => {
        const addr = typeof row.delivery_address === 'string'
          ? JSON.parse(row.delivery_address)
          : row.delivery_address;
        return addr.street === currentAddress.street;
      });

      // Multiple different addresses in short time can be suspicious
      if (!hasUsedAddress && result.length > 5) {
        return {
          isSuspicious: true,
          details: `New delivery address while customer has used ${result.length} different addresses recently`
        };
      }

      return { isSuspicious: false };
    } catch (error) {
      logger.error('Address pattern check error:', error);
      return { isSuspicious: false };
    }
  }

  /**
   * Check for unusual ordering times
   */
  checkTimePattern(order) {
    const hour = new Date().getHours();

    // Orders between 2 AM and 5 AM can be slightly suspicious
    if (hour >= 2 && hour < 5) {
      return {
        isSuspicious: true,
        details: `Order placed at unusual hour: ${hour}:00`
      };
    }

    return { isSuspicious: false };
  }

  /**
   * Check for duplicate orders (same items, address within minutes)
   */
  async checkDuplicateOrders(order) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const result = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE customer_id = :customerId
        AND restaurant_id = :restaurantId
        AND created_at > :fiveMinutesAgo
        AND id != :orderId
      `, {
        replacements: {
          customerId: order.customer_id,
          restaurantId: order.restaurant_id,
          fiveMinutesAgo,
          orderId: order.id || '00000000-0000-0000-0000-000000000000'
        },
        type: sequelize.QueryTypes.SELECT
      });

      const count = parseInt(result[0].count) || 0;

      if (count > 0) {
        return {
          isSuspicious: true,
          details: `${count} similar order(s) placed in the last 5 minutes`
        };
      }

      return { isSuspicious: false };
    } catch (error) {
      logger.error('Duplicate check error:', error);
      return { isSuspicious: false };
    }
  }

  /**
   * Calculate risk level from score
   */
  calculateRiskLevel(score) {
    if (score >= this.RISK_THRESHOLDS.critical) return 'critical';
    if (score >= this.RISK_THRESHOLDS.high) return 'high';
    if (score >= this.RISK_THRESHOLDS.medium) return 'medium';
    if (score >= this.RISK_THRESHOLDS.low) return 'low';
    return 'safe';
  }

  /**
   * Get recommendation based on risk level
   */
  getRecommendation(riskLevel) {
    const recommendations = {
      safe: 'Proceed normally',
      low: 'Monitor order progress',
      medium: 'Additional verification recommended',
      high: 'Manual review required before processing',
      critical: 'Block order and flag for investigation'
    };

    return recommendations[riskLevel] || 'Unknown risk level';
  }

  /**
   * Log fraud check to database
   */
  async logFraudCheck(entityType, entityId, riskScore, riskLevel, indicators) {
    try {
      await sequelize.query(`
        INSERT INTO fraud_logs (entity_type, entity_id, risk_score, risk_level, fraud_indicators, created_at)
        VALUES (:entityType, :entityId, :riskScore, :riskLevel, :indicators, NOW())
      `, {
        replacements: {
          entityType,
          entityId,
          riskScore,
          riskLevel,
          indicators: JSON.stringify(indicators)
        }
      });
    } catch (error) {
      logger.error('Failed to log fraud check:', error);
    }
  }

  /**
   * Analyze user registration for fraud
   */
  async analyzeUserRegistration(userData) {
    const indicators = [];
    let riskScore = 0;

    // Check for disposable email
    const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];
    const emailDomain = userData.email.split('@')[1];

    if (disposableDomains.includes(emailDomain)) {
      riskScore += 40;
      indicators.push({
        type: 'disposable_email',
        severity: 'high',
        details: 'Using disposable email service'
      });
    }

    const riskLevel = this.calculateRiskLevel(riskScore);

    return {
      riskScore,
      riskLevel,
      isFraudulent: riskLevel === 'critical',
      requiresReview: riskLevel === 'high' || riskLevel === 'critical',
      indicators
    };
  }
}

module.exports = new FraudDetectionEngine();
