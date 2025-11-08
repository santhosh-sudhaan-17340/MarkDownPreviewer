const { Webhook, WebhookDelivery } = require('../models');
const axios = require('axios');
const crypto = require('crypto');

class WebhookService {

  // Trigger webhooks for an event
  static async triggerWebhooks(eventType, payload) {
    try {
      const webhooks = await Webhook.findAll({
        where: {
          is_active: true,
          event_types: {
            [Op.contains]: [eventType]
          }
        }
      });

      const deliveryPromises = webhooks.map(webhook =>
        this.deliverWebhook(webhook, eventType, payload)
      );

      await Promise.allSettled(deliveryPromises);
    } catch (error) {
      console.error('Error triggering webhooks:', error);
    }
  }

  // Deliver webhook to endpoint
  static async deliverWebhook(webhook, eventType, payload, attemptNumber = 1) {
    try {
      const signature = this.generateSignature(webhook.secret_key, payload);

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Event-Type': eventType
        },
        timeout: webhook.timeout_ms || 5000
      });

      // Log successful delivery
      await this.logDelivery(webhook.id, payload.ticket?.id, eventType, payload, response.status, response.data, attemptNumber);

      return { success: true, status: response.status };
    } catch (error) {
      console.error(`Webhook delivery failed (attempt ${attemptNumber}):`, error.message);

      // Log failed delivery
      await this.logDelivery(
        webhook.id,
        payload.ticket?.id,
        eventType,
        payload,
        error.response?.status || 0,
        error.message,
        attemptNumber
      );

      // Retry if configured
      if (attemptNumber < webhook.retry_count) {
        const delay = Math.pow(2, attemptNumber) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.deliverWebhook(webhook, eventType, payload, attemptNumber + 1);
      }

      return { success: false, error: error.message };
    }
  }

  // Generate HMAC signature
  static generateSignature(secretKey, payload) {
    if (!secretKey) return '';

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  // Log webhook delivery
  static async logDelivery(webhookId, ticketId, eventType, payload, status, response, attemptNumber) {
    try {
      const { WebhookDelivery } = require('../models');
      await WebhookDelivery.create({
        webhook_id: webhookId,
        ticket_id: ticketId,
        event_type: eventType,
        payload,
        response_status: status,
        response_body: typeof response === 'string' ? response : JSON.stringify(response),
        attempt_number: attemptNumber
      });
    } catch (error) {
      console.error('Error logging webhook delivery:', error);
    }
  }

  // Verify webhook signature (for incoming webhooks)
  static verifySignature(secretKey, signature, payload) {
    const expectedSignature = this.generateSignature(secretKey, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Get webhook delivery history
  static async getDeliveryHistory(webhookId, limit = 50) {
    const { WebhookDelivery } = require('../models');
    return await WebhookDelivery.findAll({
      where: { webhook_id: webhookId },
      limit,
      order: [['delivered_at', 'DESC']]
    });
  }

  // Retry failed delivery
  static async retryDelivery(deliveryId) {
    const { WebhookDelivery } = require('../models');
    const delivery = await WebhookDelivery.findByPk(deliveryId, {
      include: ['Webhook']
    });

    if (!delivery || !delivery.Webhook) {
      throw new Error('Delivery or webhook not found');
    }

    return await this.deliverWebhook(
      delivery.Webhook,
      delivery.event_type,
      delivery.payload,
      delivery.attempt_number + 1
    );
  }
}

module.exports = WebhookService;
