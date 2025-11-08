import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { Dispute } from '../types';
import { PaymentService } from './paymentService';
import logger from '../utils/logger';

export class DisputeService {
  /**
   * Create a new dispute for a transaction
   */
  static async createDispute(data: {
    transactionId: string;
    userId: string;
    disputeType: 'UNAUTHORIZED' | 'AMOUNT_MISMATCH' | 'NOT_RECEIVED' | 'DUPLICATE' | 'OTHER';
    description: string;
  }): Promise<Dispute> {
    try {
      // Verify user is part of the transaction
      const txResult = await query(
        `SELECT t.*, sa.user_id as sender_user_id, ra.user_id as receiver_user_id
         FROM transactions t
         JOIN bank_accounts sa ON t.sender_account_id = sa.id
         LEFT JOIN bank_accounts ra ON t.receiver_account_id = ra.id
         WHERE t.id = $1`,
        [data.transactionId]
      );

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const transaction = txResult.rows[0];

      if (transaction.sender_user_id !== data.userId && transaction.receiver_user_id !== data.userId) {
        throw new Error('Unauthorized to dispute this transaction');
      }

      // Check if dispute already exists
      const existingDispute = await query(
        'SELECT * FROM disputes WHERE transaction_id = $1 AND status IN ($2, $3)',
        [data.transactionId, 'OPEN', 'UNDER_REVIEW']
      );

      if (existingDispute.rows.length > 0) {
        throw new Error('Dispute already exists for this transaction');
      }

      // Create dispute
      const result = await query(
        `INSERT INTO disputes (transaction_id, raised_by_user_id, dispute_type, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.transactionId, data.userId, data.disputeType, data.description]
      );

      const dispute = result.rows[0];

      logger.info(`Dispute created: ${dispute.id} for transaction ${data.transactionId}`);
      return dispute;

    } catch (error) {
      logger.error('Failed to create dispute', error);
      throw error;
    }
  }

  /**
   * Get disputes for a user
   */
  static async getUserDisputes(userId: string): Promise<Dispute[]> {
    const result = await query(
      `SELECT d.*, t.transaction_ref, t.amount
       FROM disputes d
       JOIN transactions t ON d.transaction_id = t.id
       WHERE d.raised_by_user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get dispute by ID
   */
  static async getDisputeById(disputeId: string, userId: string): Promise<Dispute | null> {
    const result = await query(
      `SELECT d.*, t.transaction_ref, t.amount
       FROM disputes d
       JOIN transactions t ON d.transaction_id = t.id
       WHERE d.id = $1 AND d.raised_by_user_id = $2`,
      [disputeId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update dispute status (admin/system function)
   */
  static async updateDisputeStatus(
    disputeId: string,
    status: 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED',
    resolution?: string
  ): Promise<Dispute> {
    const result = await query(
      `UPDATE disputes
       SET status = $1,
           resolution = $2,
           resolved_at = CASE WHEN $1 IN ('RESOLVED', 'REJECTED') THEN NOW() ELSE NULL END
       WHERE id = $3
       RETURNING *`,
      [status, resolution, disputeId]
    );

    if (result.rows.length === 0) {
      throw new Error('Dispute not found');
    }

    const dispute = result.rows[0];

    logger.info(`Dispute ${disputeId} updated to ${status}`);
    return dispute;
  }

  /**
   * Resolve dispute with transaction reversal
   */
  static async resolveWithReversal(disputeId: string, resolution: string): Promise<void> {
    try {
      // Get dispute details
      const disputeResult = await query(
        'SELECT * FROM disputes WHERE id = $1',
        [disputeId]
      );

      if (disputeResult.rows.length === 0) {
        throw new Error('Dispute not found');
      }

      const dispute = disputeResult.rows[0];

      // Reverse the transaction
      await PaymentService.reverseTransaction(
        dispute.transaction_id,
        `Dispute resolution: ${resolution}`
      );

      // Update dispute status
      await this.updateDisputeStatus(disputeId, 'RESOLVED', resolution);

      logger.info(`Dispute ${disputeId} resolved with reversal`);

    } catch (error) {
      logger.error('Failed to resolve dispute with reversal', error);
      throw error;
    }
  }

  /**
   * Auto-resolve disputes based on rules
   */
  static async autoResolveDisputes(): Promise<void> {
    try {
      // Get open disputes older than 7 days with no activity
      const disputes = await query(
        `SELECT d.*, t.status as transaction_status
         FROM disputes d
         JOIN transactions t ON d.transaction_id = t.id
         WHERE d.status = 'OPEN'
         AND d.created_at < NOW() - INTERVAL '7 days'`
      );

      for (const dispute of disputes.rows) {
        // Auto-resolve based on dispute type and transaction status
        if (dispute.dispute_type === 'NOT_RECEIVED' && dispute.transaction_status === 'SUCCESS') {
          await this.updateDisputeStatus(
            dispute.id,
            'REJECTED',
            'Auto-resolved: Transaction was successful and funds were transferred'
          );
        } else if (dispute.transaction_status === 'FAILED') {
          await this.updateDisputeStatus(
            dispute.id,
            'RESOLVED',
            'Auto-resolved: Transaction failed, no funds were transferred'
          );
        } else {
          // Move to manual review
          await this.updateDisputeStatus(
            dispute.id,
            'UNDER_REVIEW',
            'Moved to manual review after 7 days'
          );
        }
      }

      logger.info(`Auto-resolved ${disputes.rows.length} disputes`);

    } catch (error) {
      logger.error('Auto-resolve disputes failed', error);
    }
  }

  /**
   * Get dispute statistics
   */
  static async getDisputeStatistics(): Promise<any> {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'OPEN') as open_count,
         COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as under_review_count,
         COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_count,
         COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count,
         COUNT(*) FILTER (WHERE dispute_type = 'UNAUTHORIZED') as unauthorized_count,
         COUNT(*) FILTER (WHERE dispute_type = 'AMOUNT_MISMATCH') as amount_mismatch_count,
         COUNT(*) FILTER (WHERE dispute_type = 'NOT_RECEIVED') as not_received_count
       FROM disputes
       WHERE created_at > NOW() - INTERVAL '30 days'`
    );

    return result.rows[0];
  }
}
