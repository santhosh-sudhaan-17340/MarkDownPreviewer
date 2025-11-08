import { Request, Response } from 'express';
import Joi from 'joi';
import { PaymentService } from '../services/paymentService';
import { AuthService } from '../services/authService';
import logger from '../utils/logger';

const paymentSchema = Joi.object({
  senderAccountId: Joi.string().uuid().required(),
  receiverAccountId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().optional(),
  pin: Joi.string().pattern(/^[0-9]{4,6}$/).required()
});

export class PaymentController {
  static async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = paymentSchema.validate(req.body);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const userId = (req as any).user.id;

      // Verify PIN
      const validPin = await AuthService.verifyPin(userId, value.pin);
      if (!validPin) {
        res.status(401).json({ error: 'Invalid PIN' });
        return;
      }

      const transaction = await PaymentService.processPayment({
        ...value,
        userId
      });

      res.status(201).json({
        message: 'Payment processed successfully',
        transaction
      });

    } catch (error: any) {
      logger.error('Payment processing error', error);
      res.status(400).json({ error: error.message || 'Payment failed' });
    }
  }

  static async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const transactions = await PaymentService.getTransactionHistory(userId, limit);

      res.json({ transactions });

    } catch (error) {
      logger.error('Get transaction history error', error);
      res.status(500).json({ error: 'Failed to get transaction history' });
    }
  }

  static async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const userId = (req as any).user.id;

      const transaction = await PaymentService.getTransactionById(transactionId, userId);

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json({ transaction });

    } catch (error) {
      logger.error('Get transaction error', error);
      res.status(500).json({ error: 'Failed to get transaction' });
    }
  }
}
