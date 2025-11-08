import axios, { AxiosError } from 'axios';
import { query } from '../config/database';
import { config } from '../config/config';
import logger from '../utils/logger';

interface BankIntegration {
  id: string;
  bank_name: string;
  bank_code: string;
  api_endpoint: string;
  is_active: boolean;
}

export class BankIntegrationService {
  /**
   * Notify bank about transfer (simulated multi-bank support)
   */
  static async notifyBankTransfer(
    senderAccountId: string,
    receiverAccountId: string,
    amount: number
  ): Promise<boolean> {
    try {
      // Get sender and receiver bank details
      const accountsResult = await query(
        `SELECT id, bank_name, account_number, ifsc_code
         FROM bank_accounts
         WHERE id = $1 OR id = $2`,
        [senderAccountId, receiverAccountId]
      );

      const accounts = accountsResult.rows;
      const senderAccount = accounts.find(a => a.id === senderAccountId);
      const receiverAccount = accounts.find(a => a.id === receiverAccountId);

      if (!senderAccount || !receiverAccount) {
        throw new Error('Account details not found');
      }

      // Get bank integration details
      const senderBank = await this.getBankIntegration(senderAccount.bank_name);
      const receiverBank = await this.getBankIntegration(receiverAccount.bank_name);

      // Simulate bank API calls
      if (senderAccount.bank_name === receiverAccount.bank_name) {
        // Same bank transfer - single API call
        await this.callBankAPI(senderBank, {
          type: 'INTRA_BANK_TRANSFER',
          from_account: senderAccount.account_number,
          to_account: receiverAccount.account_number,
          amount: amount,
          timestamp: new Date().toISOString()
        });
      } else {
        // Different banks - use IMPS/NEFT simulation
        await this.callBankAPI(senderBank, {
          type: 'IMPS_DEBIT',
          account: senderAccount.account_number,
          beneficiary_ifsc: receiverAccount.ifsc_code,
          beneficiary_account: receiverAccount.account_number,
          amount: amount,
          timestamp: new Date().toISOString()
        });

        await this.callBankAPI(receiverBank, {
          type: 'IMPS_CREDIT',
          account: receiverAccount.account_number,
          sender_ifsc: senderAccount.ifsc_code,
          sender_account: senderAccount.account_number,
          amount: amount,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Bank notification successful for transfer: ${senderAccountId} -> ${receiverAccountId}`);
      return true;

    } catch (error) {
      logger.error('Bank notification failed', error);
      throw error;
    }
  }

  /**
   * Get bank integration details
   */
  private static async getBankIntegration(bankName: string): Promise<BankIntegration> {
    const result = await query(
      'SELECT * FROM bank_integrations WHERE bank_name = $1 AND is_active = true',
      [bankName]
    );

    if (result.rows.length === 0) {
      throw new Error(`Bank integration not found for ${bankName}`);
    }

    return result.rows[0];
  }

  /**
   * Call bank API (simulated)
   */
  private static async callBankAPI(bank: BankIntegration, payload: any): Promise<any> {
    try {
      // In production, this would make actual API calls to bank systems
      // For now, we simulate the call with a timeout
      logger.info(`Calling bank API for ${bank.bank_name}`, payload);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate 95% success rate
      if (Math.random() < 0.05) {
        throw new Error('Bank API temporarily unavailable');
      }

      // In production:
      // const response = await axios.post(bank.api_endpoint, payload, {
      //   timeout: config.bank.apiTimeout,
      //   headers: {
      //     'Authorization': `Bearer ${bank.api_key}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // return response.data;

      return { success: true, transaction_id: `BANK_${Date.now()}` };

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error(`Bank API error for ${bank.bank_name}:`, axiosError.message);
        throw new Error(`Bank API error: ${axiosError.message}`);
      }
      throw error;
    }
  }

  /**
   * Verify bank account (simulated)
   */
  static async verifyBankAccount(
    accountNumber: string,
    ifscCode: string,
    bankName: string
  ): Promise<{ verified: boolean; accountHolderName?: string }> {
    try {
      const bank = await this.getBankIntegration(bankName);

      // Simulate account verification
      logger.info(`Verifying account ${accountNumber} at ${bankName}`);

      // In production, call actual bank verification API
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate verification (90% success rate)
      if (Math.random() < 0.9) {
        return {
          verified: true,
          accountHolderName: 'Account Holder Name'
        };
      } else {
        return {
          verified: false
        };
      }

    } catch (error) {
      logger.error('Account verification failed', error);
      return { verified: false };
    }
  }

  /**
   * Get bank balance (simulated)
   */
  static async getBankBalance(accountId: string): Promise<number> {
    const result = await query(
      'SELECT balance FROM bank_accounts WHERE id = $1',
      [accountId]
    );

    if (result.rows.length === 0) {
      throw new Error('Account not found');
    }

    return parseFloat(result.rows[0].balance);
  }

  /**
   * Health check for all bank integrations
   */
  static async performHealthCheck(): Promise<void> {
    const result = await query('SELECT * FROM bank_integrations');
    const banks = result.rows;

    for (const bank of banks) {
      try {
        // Simulate health check
        await new Promise(resolve => setTimeout(resolve, 100));

        const isHealthy = Math.random() > 0.1; // 90% healthy

        await query(
          `UPDATE bank_integrations
           SET last_health_check = NOW(),
               health_status = $1
           WHERE id = $2`,
          [isHealthy ? 'HEALTHY' : 'DEGRADED', bank.id]
        );

        logger.info(`Health check for ${bank.bank_name}: ${isHealthy ? 'HEALTHY' : 'DEGRADED'}`);

      } catch (error) {
        logger.error(`Health check failed for ${bank.bank_name}`, error);

        await query(
          `UPDATE bank_integrations
           SET last_health_check = NOW(),
               health_status = $1
           WHERE id = $2`,
          ['DOWN', bank.id]
        );
      }
    }
  }
}
