const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { connectPostgres } = require('../../config/database');
const logger = require('../../utils/logger');
const { errorHandler, notFound } = require('../../middleware/errorHandler');
const { authenticate } = require('../../middleware/auth');
const { sequelize } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PAYMENT_SERVICE_PORT || 3007;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Payment Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Process payment
app.post('/api/payments/process', authenticate, async (req, res, next) => {
  try {
    const { orderId, amount, paymentMethod, cardDetails } = req.body;

    // Mock payment processing
    const transactionId = `TXN-${Date.now()}-${uuidv4().substr(0, 8)}`;

    // Simulate payment gateway call
    const paymentSuccess = Math.random() > 0.1; // 90% success rate

    await sequelize.query(`
      INSERT INTO payments (order_id, transaction_id, payment_method, amount, status, gateway_response)
      VALUES (:orderId, :transactionId, :paymentMethod, :amount, :status, :gatewayResponse)
    `, {
      replacements: {
        orderId,
        transactionId,
        paymentMethod,
        amount,
        status: paymentSuccess ? 'success' : 'failed',
        gatewayResponse: JSON.stringify({
          success: paymentSuccess,
          message: paymentSuccess ? 'Payment processed successfully' : 'Payment declined',
          timestamp: new Date()
        })
      }
    });

    res.json({
      success: paymentSuccess,
      message: paymentSuccess ? 'Payment successful' : 'Payment failed',
      data: {
        transactionId,
        amount,
        status: paymentSuccess ? 'success' : 'failed'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get payment details
app.get('/api/payments/:transactionId', authenticate, async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const payments = await sequelize.query(`
      SELECT * FROM payments WHERE transaction_id = :transactionId
    `, {
      replacements: { transactionId },
      type: sequelize.QueryTypes.SELECT
    });

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payments[0]
    });
  } catch (error) {
    next(error);
  }
});

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectPostgres();
    app.listen(PORT, () => {
      logger.info(`Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Payment Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
