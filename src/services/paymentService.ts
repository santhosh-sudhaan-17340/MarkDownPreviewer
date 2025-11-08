import { v4 as uuidv4 } from 'uuid';
import { query, getClient } from '../config/database';
import { Transaction } from '../types';
import { FraudService } from './fraudService';
import { BankIntegrationService } from './bankIntegrationService';
import { TransactionRetryService } from './transactionRetryService';
import logger from '../utils/logger';

export class PaymentService {
  /**
   * Process P2P payment with fraud detection and retry mechanism
   */
  static async processPayment(data: {
    senderAccountId: string;
    receiverAccountId: string;
    amount: number;
    description?: string;
    pin: string;
    userId: string;
  }): Promise<Transaction> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Validate sender account
      const senderResult = await client.query(
        'SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2 AND is_verified = true',
        [data.senderAccountId, data.userId]
      );

      if (senderResult.rows.length === 0) {
        throw new Error('Invalid sender account');
      }

      const senderAccount = senderResult.rows[0];

      // Check balance
      if (senderAccount.balance < data.amount) {
        throw new Error('Insufficient balance');
      }

      // Validate receiver account
      const receiverResult = await client.query(
        'SELECT * FROM bank_accounts WHERE id = $1 AND is_verified = true',
        [data.receiverAccountId]
      );

      if (receiverResult.rows.length === 0) {
        throw new Error('Invalid receiver account');
      }

      // Calculate fraud score
      const fraudScore = await FraudService.calculateFraudScore(
        data.userId,
        data.amount,
        data.receiverAccountId
      );

      // Block high-risk transactions
      if (await FraudService.shouldBlockTransaction(fraudScore)) {
        await FraudService.createFraudAlert(
          '',
          data.userId,
          'HIGH_RISK_BLOCKED',
          fraudScore,
          'Transaction blocked due to high fraud risk'
        );
        throw new Error('Transaction blocked - high fraud risk detected');
      }

      // Create transaction record
      const transactionRef = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const txResult = await client.query(
        `INSERT INTO transactions
         (transaction_ref, sender_account_id, receiver_account_id, amount, transaction_type, status, description, fraud_score, is_flagged)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          transactionRef,
          data.senderAccountId,
          data.receiverAccountId,
          data.amount,
          'P2P',
          'PENDING',
          data.description,
          fraudScore,
          await FraudService.requiresManualReview(fraudScore)
        ]
      );

      const transaction = txResult.rows[0];

      // If requires manual review, flag it
      if (transaction.is_flagged) {
        await FraudService.createFraudAlert(
          transaction.id,
          data.userId,
          'MANUAL_REVIEW_REQUIRED',
          fraudScore,
          'Transaction flagged for manual review'
        );
      }

      // Process transaction with retry mechanism
      const success = await TransactionRetryService.executeWithRetry(
        async () => {
          return await this.executeTransaction(
            client,
            transaction.id,
            data.senderAccountId,
            data.receiverAccountId,
            data.amount
          );
        },
        transaction.id
      );

      if (!success) {
        await client.query('ROLLBACK');
        throw new Error('Transaction failed after retries');
      }

      // Update transaction status
      await client.query(
        `UPDATE transactions
         SET status = $1, completed_at = NOW()
         WHERE id = $2`,
        ['SUCCESS', transaction.id]
      );

      await client.query('COMMIT');

      logger.info(`Payment processed successfully: ${transaction.transaction_ref}`);
      return transaction;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Payment processing failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute the actual transfer between accounts
   */
  private static async executeTransaction(
    client: any,
    transactionId: string,
    senderAccountId: string,
    receiverAccountId: string,
    amount: number
  ): Promise<boolean> {
    try {
      // Update transaction status to processing
      await client.query(
        'UPDATE transactions SET status = $1 WHERE id = $2',
        ['PROCESSING', transactionId]
      );

      // Debit sender account
      const debitResult = await client.query(
        `UPDATE bank_accounts
         SET balance = balance - $1
         WHERE id = $2 AND balance >= $1
         RETURNING balance`,
        [amount, senderAccountId]
      );

      if (debitResult.rows.length === 0) {
        throw new Error('Insufficient balance or account not found');
      }

      // Credit receiver account
      await client.query(
        `UPDATE bank_accounts
         SET balance = balance + $1
         WHERE id = $2`,
        [amount, receiverAccountId]
      );

      // Simulate bank API call
      await BankIntegrationService.notifyBankTransfer(
        senderAccountId,
        receiverAccountId,
        amount
      );

      return true;
    } catch (error) {
      logger.error('Transaction execution failed', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a user
   */
  static async getTransactionHistory(userId: string, limit: number = 50): Promise<Transaction[]> {
    const result = await query(
      `SELECT t.*,
              sa.account_number as sender_account,
              ra.account_number as receiver_account
       FROM transactions t
       LEFT JOIN bank_accounts sa ON t.sender_account_id = sa.id
       LEFT JOIN bank_accounts ra ON t.receiver_account_id = ra.id
       WHERE sa.user_id = $1 OR ra.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get transaction details by ID
   */
  static async getTransactionById(transactionId: string, userId: string): Promise<Transaction | null> {
    const result = await query(
      `SELECT t.*,
              sa.account_number as sender_account,
              ra.account_number as receiver_account
       FROM transactions t
       LEFT JOIN bank_accounts sa ON t.sender_account_id = sa.id
       LEFT JOIN bank_accounts ra ON t.receiver_account_id = ra.id
       WHERE t.id = $1 AND (sa.user_id = $2 OR ra.user_id = $2)`,
      [transactionId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Reverse a transaction (for disputes or failed transactions)
   */
  static async reverseTransaction(transactionId: string, reason: string): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const txResult = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND status = $2',
        [transactionId, 'SUCCESS']
      );

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found or cannot be reversed');
      }

      const transaction = txResult.rows[0];

      // Credit sender account
      await client.query(
        'UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2',
        [transaction.amount, transaction.sender_account_id]
      );

      // Debit receiver account
      await client.query(
        'UPDATE bank_accounts SET balance = balance - $1 WHERE id = $2',
        [transaction.amount, transaction.receiver_account_id]
      );

      // Update transaction status
      await client.query(
        'UPDATE transactions SET status = $1 WHERE id = $2',
        ['REVERSED', transactionId]
      );

      await client.query('COMMIT');
      logger.info(`Transaction reversed: ${transactionId} - Reason: ${reason}`);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction reversal failed', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
