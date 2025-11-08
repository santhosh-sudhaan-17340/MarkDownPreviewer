import { Request, Response } from 'express';
import Joi from 'joi';
import { DisputeService } from '../services/disputeService';
import logger from '../utils/logger';

const createDisputeSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
  disputeType: Joi.string().valid('UNAUTHORIZED', 'AMOUNT_MISMATCH', 'NOT_RECEIVED', 'DUPLICATE', 'OTHER').required(),
  description: Joi.string().min(10).required()
});

export class DisputeController {
  static async createDispute(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = createDisputeSchema.validate(req.body);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const userId = (req as any).user.id;

      const dispute = await DisputeService.createDispute({
        ...value,
        userId
      });

      res.status(201).json({
        message: 'Dispute created successfully',
        dispute
      });

    } catch (error: any) {
      logger.error('Create dispute error', error);
      res.status(400).json({ error: error.message || 'Failed to create dispute' });
    }
  }

  static async getUserDisputes(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const disputes = await DisputeService.getUserDisputes(userId);

      res.json({ disputes });

    } catch (error) {
      logger.error('Get disputes error', error);
      res.status(500).json({ error: 'Failed to get disputes' });
    }
  }

  static async getDisputeById(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const userId = (req as any).user.id;

      const dispute = await DisputeService.getDisputeById(disputeId, userId);

      if (!dispute) {
        res.status(404).json({ error: 'Dispute not found' });
        return;
      }

      res.json({ dispute });

    } catch (error) {
      logger.error('Get dispute error', error);
      res.status(500).json({ error: 'Failed to get dispute' });
    }
  }

  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await DisputeService.getDisputeStatistics();

      res.json({ statistics: stats });

    } catch (error) {
      logger.error('Get dispute statistics error', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  }
}
