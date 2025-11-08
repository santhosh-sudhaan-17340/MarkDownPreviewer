import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { QRCode as QRCodeType } from '../types';
import logger from '../utils/logger';

export class QRCodeService {
  /**
   * Generate QR code for payment
   */
  static async generateQRCode(data: {
    userId: string;
    accountId: string;
    amount?: number;
    description?: string;
    expiresInMinutes?: number;
  }): Promise<{ qrCode: QRCodeType; qrImage: string }> {
    try {
      // Verify account belongs to user
      const accountResult = await query(
        'SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2',
        [data.accountId, data.userId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Invalid account');
      }

      const account = accountResult.rows[0];

      // Create QR code data
      const qrData = {
        type: 'UPI_PAYMENT',
        version: '1.0',
        accountId: data.accountId,
        accountNumber: account.account_number,
        ifscCode: account.ifsc_code,
        accountHolderName: account.account_holder_name,
        amount: data.amount,
        description: data.description,
        timestamp: new Date().toISOString(),
        qrId: uuidv4()
      };

      const qrDataString = JSON.stringify(qrData);

      // Generate QR code image
      const qrImage = await QRCode.toDataURL(qrDataString, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300
      });

      // Calculate expiry
      const expiresAt = data.expiresInMinutes
        ? new Date(Date.now() + data.expiresInMinutes * 60 * 1000)
        : null;

      // Store QR code in database
      const result = await query(
        `INSERT INTO qr_codes
         (id, user_id, account_id, qr_data, amount, description, is_dynamic, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          qrData.qrId,
          data.userId,
          data.accountId,
          qrDataString,
          data.amount || null,
          data.description || null,
          data.amount ? false : true, // Dynamic if no amount specified
          expiresAt
        ]
      );

      logger.info(`QR code generated for account ${data.accountId}`);

      return {
        qrCode: result.rows[0],
        qrImage
      };

    } catch (error) {
      logger.error('QR code generation failed', error);
      throw error;
    }
  }

  /**
   * Validate and decode QR code
   */
  static async validateQRCode(qrDataString: string): Promise<{
    valid: boolean;
    qrCode?: QRCodeType;
    qrData?: any;
    error?: string;
  }> {
    try {
      // Parse QR data
      const qrData = JSON.parse(qrDataString);

      // Verify it's a valid payment QR code
      if (qrData.type !== 'UPI_PAYMENT') {
        return { valid: false, error: 'Invalid QR code type' };
      }

      // Get QR code from database
      const result = await query(
        'SELECT * FROM qr_codes WHERE id = $1 AND is_active = true',
        [qrData.qrId]
      );

      if (result.rows.length === 0) {
        return { valid: false, error: 'QR code not found or inactive' };
      }

      const qrCode = result.rows[0];

      // Check expiry
      if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
        return { valid: false, error: 'QR code has expired' };
      }

      // Check if already used (for non-dynamic QR codes)
      if (!qrCode.is_dynamic && qrCode.used_at) {
        return { valid: false, error: 'QR code has already been used' };
      }

      return {
        valid: true,
        qrCode,
        qrData
      };

    } catch (error) {
      logger.error('QR code validation failed', error);
      return { valid: false, error: 'Invalid QR code format' };
    }
  }

  /**
   * Process payment via QR code
   */
  static async processQRPayment(data: {
    qrDataString: string;
    senderAccountId: string;
    userId: string;
    pin: string;
    amount?: number; // Required for dynamic QR codes
  }): Promise<any> {
    try {
      // Validate QR code
      const validation = await this.validateQRCode(data.qrDataString);

      if (!validation.valid || !validation.qrCode || !validation.qrData) {
        throw new Error(validation.error || 'Invalid QR code');
      }

      const { qrCode, qrData } = validation;

      // Determine payment amount
      let paymentAmount: number;

      if (qrCode.is_dynamic) {
        if (!data.amount) {
          throw new Error('Amount required for dynamic QR code');
        }
        paymentAmount = data.amount;
      } else {
        if (qrCode.amount === null) {
          throw new Error('QR code amount not set');
        }
        paymentAmount = parseFloat(qrCode.amount.toString());
      }

      // Import PaymentService here to avoid circular dependency
      const { PaymentService } = await import('./paymentService');

      // Process payment
      const transaction = await PaymentService.processPayment({
        senderAccountId: data.senderAccountId,
        receiverAccountId: qrCode.account_id,
        amount: paymentAmount,
        description: qrCode.description || 'QR Payment',
        pin: data.pin,
        userId: data.userId
      });

      // Mark QR code as used (for non-dynamic QR codes)
      if (!qrCode.is_dynamic) {
        await query(
          'UPDATE qr_codes SET used_at = NOW() WHERE id = $1',
          [qrCode.id]
        );
      }

      // Link transaction to QR code
      await query(
        'UPDATE transactions SET qr_code_id = $1 WHERE id = $2',
        [qrCode.id, transaction.id]
      );

      logger.info(`QR payment processed: ${transaction.transaction_ref}`);

      return transaction;

    } catch (error) {
      logger.error('QR payment processing failed', error);
      throw error;
    }
  }

  /**
   * Get user's QR codes
   */
  static async getUserQRCodes(userId: string): Promise<QRCodeType[]> {
    const result = await query(
      `SELECT * FROM qr_codes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Deactivate QR code
   */
  static async deactivateQRCode(qrCodeId: string, userId: string): Promise<void> {
    const result = await query(
      `UPDATE qr_codes
       SET is_active = false
       WHERE id = $1 AND user_id = $2`,
      [qrCodeId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('QR code not found or unauthorized');
    }

    logger.info(`QR code deactivated: ${qrCodeId}`);
  }
}
