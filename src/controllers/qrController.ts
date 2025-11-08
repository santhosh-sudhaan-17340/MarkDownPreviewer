import { Request, Response } from 'express';
import Joi from 'joi';
import { QRCodeService } from '../services/qrCodeService';
import { AuthService } from '../services/authService';
import logger from '../utils/logger';

const generateQRSchema = Joi.object({
  accountId: Joi.string().uuid().required(),
  amount: Joi.number().positive().optional(),
  description: Joi.string().optional(),
  expiresInMinutes: Joi.number().positive().optional()
});

const qrPaymentSchema = Joi.object({
  qrDataString: Joi.string().required(),
  senderAccountId: Joi.string().uuid().required(),
  pin: Joi.string().pattern(/^[0-9]{4,6}$/).required(),
  amount: Joi.number().positive().optional()
});

export class QRController {
  static async generateQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = generateQRSchema.validate(req.body);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const userId = (req as any).user.id;

      const result = await QRCodeService.generateQRCode({
        ...value,
        userId
      });

      res.status(201).json({
        message: 'QR code generated successfully',
        qrCode: result.qrCode,
        qrImage: result.qrImage
      });

    } catch (error: any) {
      logger.error('QR generation error', error);
      res.status(400).json({ error: error.message || 'QR code generation failed' });
    }
  }

  static async validateQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { qrDataString } = req.body;

      if (!qrDataString) {
        res.status(400).json({ error: 'QR data is required' });
        return;
      }

      const result = await QRCodeService.validateQRCode(qrDataString);

      res.json(result);

    } catch (error) {
      logger.error('QR validation error', error);
      res.status(500).json({ error: 'QR code validation failed' });
    }
  }

  static async processQRPayment(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = qrPaymentSchema.validate(req.body);

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

      const transaction = await QRCodeService.processQRPayment({
        ...value,
        userId
      });

      res.status(201).json({
        message: 'QR payment processed successfully',
        transaction
      });

    } catch (error: any) {
      logger.error('QR payment error', error);
      res.status(400).json({ error: error.message || 'QR payment failed' });
    }
  }

  static async getUserQRCodes(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const qrCodes = await QRCodeService.getUserQRCodes(userId);

      res.json({ qrCodes });

    } catch (error) {
      logger.error('Get QR codes error', error);
      res.status(500).json({ error: 'Failed to get QR codes' });
    }
  }

  static async deactivateQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { qrCodeId } = req.params;
      const userId = (req as any).user.id;

      await QRCodeService.deactivateQRCode(qrCodeId, userId);

      res.json({ message: 'QR code deactivated successfully' });

    } catch (error: any) {
      logger.error('Deactivate QR code error', error);
      res.status(400).json({ error: error.message || 'Failed to deactivate QR code' });
    }
  }
}
