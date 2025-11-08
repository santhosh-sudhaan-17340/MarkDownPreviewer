const { sequelize } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const { publisher } = require('../../config/redis');
const axios = require('axios');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Service URLs
const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || 'http://localhost:3006';
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://localhost:3004';
const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002';

// Create new order
exports.createOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      restaurant_id,
      items,
      delivery_address,
      payment_method,
      special_instructions
    } = req.body;

    const customer_id = req.user.userId;

    // 1. Fetch restaurant details
    const restaurant = await axios.get(`${RESTAURANT_SERVICE_URL}/api/restaurants/${restaurant_id}`);
    const restaurantData = restaurant.data.data;

    if (!restaurantData.isActive || !restaurantData.isOpen) {
      throw new AppError('Restaurant is currently not accepting orders', 400);
    }

    // 2. Calculate order totals
    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += item.price * item.quantity;
    });

    const deliveryFee = restaurantData.deliveryFee || 0;
    const taxAmount = totalAmount * 0.05; // 5% tax
    const finalAmount = totalAmount + deliveryFee + taxAmount;

    // 3. Create order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 4. Create order in database
    const orderResult = await sequelize.query(`
      INSERT INTO orders (
        customer_id, restaurant_id, order_number, items,
        total_amount, delivery_fee, tax_amount, final_amount,
        delivery_address, restaurant_address, payment_method,
        special_instructions, status, payment_status
      ) VALUES (
        :customer_id, :restaurant_id, :order_number, :items,
        :total_amount, :delivery_fee, :tax_amount, :final_amount,
        :delivery_address, :restaurant_address, :payment_method,
        :special_instructions, 'pending', 'pending'
      ) RETURNING *
    `, {
      replacements: {
        customer_id,
        restaurant_id,
        order_number: orderNumber,
        items: JSON.stringify(items),
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        tax_amount: taxAmount,
        final_amount: finalAmount,
        delivery_address: JSON.stringify(delivery_address),
        restaurant_address: JSON.stringify(restaurantData.address),
        payment_method,
        special_instructions
      },
      type: sequelize.QueryTypes.INSERT,
      transaction
    });

    const order = orderResult[0][0];

    // 5. Fraud detection check
    try {
      const fraudCheck = await axios.post(`${FRAUD_SERVICE_URL}/api/fraud/analyze/order`, {
        id: order.id,
        customer_id,
        restaurant_id,
        order_number: orderNumber,
        final_amount: finalAmount,
        delivery_address,
        restaurantAddress: restaurantData.address
      });

      const fraudResult = fraudCheck.data.data;

      if (fraudResult.isFraudulent) {
        await transaction.rollback();
        throw new AppError('Order flagged for security review. Please contact support.', 403);
      }

      if (fraudResult.requiresReview) {
        logger.warn(`Order ${orderNumber} requires manual review. Risk level: ${fraudResult.riskLevel}`);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Fraud check failed:', error);
      // Continue anyway if fraud service is down
    }

    // 6. Commit transaction
    await transaction.commit();

    // 7. Assign delivery partner (async via pub/sub)
    publisher.publish('order:created', JSON.stringify({
      orderId: order.id,
      orderNumber: orderNumber,
      restaurantAddress: restaurantData.address,
      deliveryAddress: delivery_address
    }));

    // 8. Add to processing queue
    const orderQueue = req.app.locals.orderQueue;
    await orderQueue.add('assign_partner', {
      orderId: order.id,
      action: 'assign_partner'
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        ...order,
        items: JSON.parse(order.items),
        delivery_address: JSON.parse(order.delivery_address),
        restaurant_address: JSON.parse(order.restaurant_address)
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Get user's orders
exports.getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const customer_id = req.user.userId;

    let whereClause = 'WHERE customer_id = :customer_id';
    const replacements = { customer_id };

    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }

    const orders = await sequelize.query(`
      SELECT * FROM orders
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: {
        ...replacements,
        limit: parseInt(limit),
        offset: (page - 1) * limit
      },
      type: sequelize.QueryTypes.SELECT
    });

    const countResult = await sequelize.query(`
      SELECT COUNT(*) as count FROM orders ${whereClause}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    const total = parseInt(countResult[0].count);

    res.json({
      success: true,
      data: orders.map(order => ({
        ...order,
        items: JSON.parse(order.items),
        delivery_address: JSON.parse(order.delivery_address),
        restaurant_address: JSON.parse(order.restaurant_address)
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get order by ID
exports.getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const orders = await sequelize.query(`
      SELECT * FROM orders WHERE id = :orderId
    `, {
      replacements: { orderId },
      type: sequelize.QueryTypes.SELECT
    });

    if (orders.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orders[0];

    // Check authorization
    if (order.customer_id !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Unauthorized access', 403);
    }

    res.json({
      success: true,
      data: {
        ...order,
        items: JSON.parse(order.items),
        delivery_address: JSON.parse(order.delivery_address),
        restaurant_address: JSON.parse(order.restaurant_address)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update order status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // Update order
    await sequelize.query(`
      UPDATE orders
      SET status = :status, updated_at = NOW()
      WHERE id = :orderId
    `, {
      replacements: { orderId, status }
    });

    // Log status change
    await sequelize.query(`
      INSERT INTO order_tracking (order_id, status, notes)
      VALUES (:orderId, :status, :notes)
    `, {
      replacements: { orderId, status, notes }
    });

    // Publish status update for real-time tracking
    await publisher.publish('order:status_changed', JSON.stringify({
      orderId,
      status,
      message: `Order ${status}`,
      timestamp: new Date()
    }));

    res.json({
      success: true,
      message: 'Order status updated',
      data: { orderId, status }
    });
  } catch (error) {
    next(error);
  }
};

// Cancel order
exports.cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const orders = await sequelize.query(`
      SELECT * FROM orders WHERE id = :orderId AND customer_id = :customer_id
    `, {
      replacements: { orderId, customer_id: req.user.userId },
      type: sequelize.QueryTypes.SELECT
    });

    if (orders.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orders[0];

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new AppError('Order cannot be cancelled at this stage', 400);
    }

    await sequelize.query(`
      UPDATE orders
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = :orderId
    `, {
      replacements: { orderId }
    });

    // Log cancellation
    await sequelize.query(`
      INSERT INTO order_tracking (order_id, status, notes)
      VALUES (:orderId, 'cancelled', :reason)
    `, {
      replacements: { orderId, reason }
    });

    // Notify via pub/sub
    await publisher.publish('order:cancelled', JSON.stringify({
      orderId,
      reason,
      timestamp: new Date()
    }));

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Rate order
exports.rateOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { rating, review, restaurantRating, partnerRating } = req.body;

    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    // Verify order belongs to user and is delivered
    const orders = await sequelize.query(`
      SELECT * FROM orders
      WHERE id = :orderId AND customer_id = :customer_id AND status = 'delivered'
    `, {
      replacements: { orderId, customer_id: req.user.userId },
      type: sequelize.QueryTypes.SELECT
    });

    if (orders.length === 0) {
      throw new AppError('Order not found or not yet delivered', 404);
    }

    // Store rating (in production, would update restaurant/partner ratings)
    logger.info(`Order ${orderId} rated: ${rating} stars`);

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    next(error);
  }
};

// Track order
exports.trackOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const tracking = await sequelize.query(`
      SELECT * FROM order_tracking
      WHERE order_id = :orderId
      ORDER BY created_at ASC
    `, {
      replacements: { orderId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: tracking
    });
  } catch (error) {
    next(error);
  }
};
