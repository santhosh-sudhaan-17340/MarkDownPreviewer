import { query } from '../config/database';
import { config } from '../config/config';
import logger from '../utils/logger';

export class FraudService {
  /**
   * Calculate fraud score for a transaction
   * Returns a score between 0-100 (higher = more suspicious)
   */
  static async calculateFraudScore(
    userId: string,
    amount: number,
    receiverAccountId: string
  ): Promise<number> {
    let score = 0;

    // Check 1: Large transaction amount
    if (amount > config.fraud.thresholdAmount) {
      score += 30;
      logger.warn(`Large transaction detected: ${amount} for user ${userId}`);
    }

    // Check 2: High transaction frequency
    const hourlyCount = await this.getHourlyTransactionCount(userId);
    if (hourlyCount > config.fraud.hourlyTransactionLimit) {
      score += 25;
      logger.warn(`High transaction frequency: ${hourlyCount} for user ${userId}`);
    }

    // Check 3: Daily transaction amount limit
    const dailyAmount = await this.getDailyTransactionAmount(userId);
    if (dailyAmount > config.fraud.dailyLimit) {
      score += 30;
      logger.warn(`Daily limit exceeded: ${dailyAmount} for user ${userId}`);
    }

    // Check 4: First time receiver
    const isFirstTime = await this.isFirstTimeReceiver(userId, receiverAccountId);
    if (isFirstTime && amount > 10000) {
      score += 15;
    }

    // Check 5: Unusual transaction time (late night)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  static async getHourlyTransactionCount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) FROM transactions t
       JOIN bank_accounts ba ON t.sender_account_id = ba.id
       WHERE ba.user_id = $1
       AND t.created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async getDailyTransactionAmount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions t
       JOIN bank_accounts ba ON t.sender_account_id = ba.id
       WHERE ba.user_id = $1
       AND t.created_at > NOW() - INTERVAL '24 hours'
       AND t.status = 'SUCCESS'`,
      [userId]
    );
    return parseFloat(result.rows[0].total);
  }

  static async isFirstTimeReceiver(userId: string, receiverAccountId: string): Promise<boolean> {
    const result = await query(
      `SELECT COUNT(*) FROM transactions t
       JOIN bank_accounts ba ON t.sender_account_id = ba.id
       WHERE ba.user_id = $1
       AND t.receiver_account_id = $2
       AND t.status = 'SUCCESS'`,
      [userId, receiverAccountId]
    );
    return parseInt(result.rows[0].count) === 0;
  }

  static async createFraudAlert(
    transactionId: string,
    userId: string,
    alertType: string,
    riskScore: number,
    reason: string
  ): Promise<void> {
    await query(
      `INSERT INTO fraud_alerts (transaction_id, user_id, alert_type, risk_score, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [transactionId, userId, alertType, riskScore, reason]
    );
    logger.warn(`Fraud alert created for transaction ${transactionId}: ${reason}`);
  }

  static async shouldBlockTransaction(fraudScore: number): Promise<boolean> {
    return fraudScore >= 70;
  }

  static async requiresManualReview(fraudScore: number): Promise<boolean> {
    return fraudScore >= 50 && fraudScore < 70;
  }
}
