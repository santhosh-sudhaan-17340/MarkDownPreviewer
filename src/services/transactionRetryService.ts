import { query } from '../config/database';
import { config } from '../config/config';
import logger from '../utils/logger';

export class TransactionRetryService {
  /**
   * Execute a transaction with exponential backoff retry mechanism
   */
  static async executeWithRetry(
    transactionFn: () => Promise<boolean>,
    transactionId: string,
    maxAttempts: number = config.transaction.maxRetryAttempts
  ): Promise<boolean> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      attempt++;

      try {
        logger.info(`Transaction attempt ${attempt}/${maxAttempts} for ${transactionId}`);

        await this.logAttempt(transactionId, attempt, 'PROCESSING', null, null);

        const result = await transactionFn();

        await this.logAttempt(transactionId, attempt, 'SUCCESS', null, null);

        // Update retry count in transaction
        await query(
          'UPDATE transactions SET retry_count = $1 WHERE id = $2',
          [attempt - 1, transactionId]
        );

        logger.info(`Transaction succeeded on attempt ${attempt} for ${transactionId}`);
        return result;

      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || 'Unknown error';

        logger.warn(
          `Transaction attempt ${attempt} failed for ${transactionId}: ${errorMessage}`
        );

        await this.logAttempt(
          transactionId,
          attempt,
          'FAILED',
          error.code || 'UNKNOWN_ERROR',
          errorMessage
        );

        // Don't retry for certain errors
        if (this.shouldNotRetry(error)) {
          logger.error(`Non-retryable error for ${transactionId}: ${errorMessage}`);
          break;
        }

        // Wait before retrying with exponential backoff
        if (attempt < maxAttempts) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.info(`Waiting ${delay}ms before retry ${attempt + 1}`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    await query(
      'UPDATE transactions SET status = $1, retry_count = $2 WHERE id = $3',
      ['FAILED', attempt, transactionId]
    );

    logger.error(
      `Transaction failed after ${attempt} attempts for ${transactionId}: ${lastError?.message}`
    );

    return false;
  }

  /**
   * Log transaction attempt
   */
  private static async logAttempt(
    transactionId: string,
    attemptNumber: number,
    status: string,
    errorCode: string | null,
    errorMessage: string | null
  ): Promise<void> {
    await query(
      `INSERT INTO transaction_attempts (transaction_id, attempt_number, status, error_code, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [transactionId, attemptNumber, status, errorCode, errorMessage]
    );
  }

  /**
   * Calculate exponential backoff delay
   */
  private static calculateBackoffDelay(attempt: number): number {
    const baseDelay = config.transaction.retryDelayMs;
    // Exponential backoff: baseDelay * 2^(attempt-1)
    // With jitter to prevent thundering herd
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    return exponentialDelay + jitter;
  }

  /**
   * Check if error should not be retried
   */
  private static shouldNotRetry(error: any): boolean {
    const nonRetryableErrors = [
      'Insufficient balance',
      'Invalid sender account',
      'Invalid receiver account',
      'Transaction blocked',
      'User not found',
      'Account not verified'
    ];

    return nonRetryableErrors.some(msg =>
      error.message && error.message.includes(msg)
    );
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry history for a transaction
   */
  static async getRetryHistory(transactionId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM transaction_attempts
       WHERE transaction_id = $1
       ORDER BY attempt_number ASC`,
      [transactionId]
    );

    return result.rows;
  }
}
