import { NoShowPenalty, CancellationRule } from '@prisma/client';
import prisma from '../database/client';

export interface CreateCancellationRuleInput {
  name: string;
  hoursBeforeStart: number;
  penaltyPercentage: number;
}

export class PenaltyService {
  /**
   * Create a cancellation rule
   */
  async createCancellationRule(input: CreateCancellationRuleInput): Promise<CancellationRule> {
    if (input.hoursBeforeStart < 0) {
      throw new Error('Hours before start must be non-negative');
    }

    if (input.penaltyPercentage < 0 || input.penaltyPercentage > 100) {
      throw new Error('Penalty percentage must be between 0 and 100');
    }

    return await prisma.cancellationRule.create({
      data: input
    });
  }

  /**
   * Get all active cancellation rules
   */
  async getActiveCancellationRules(): Promise<CancellationRule[]> {
    return await prisma.cancellationRule.findMany({
      where: { isActive: true },
      orderBy: { hoursBeforeStart: 'desc' }
    });
  }

  /**
   * Get cancellation rule by ID
   */
  async getCancellationRuleById(id: string): Promise<CancellationRule | null> {
    return await prisma.cancellationRule.findUnique({
      where: { id }
    });
  }

  /**
   * Update cancellation rule
   */
  async updateCancellationRule(
    id: string,
    data: Partial<CreateCancellationRuleInput>
  ): Promise<CancellationRule> {
    return await prisma.cancellationRule.update({
      where: { id },
      data
    });
  }

  /**
   * Deactivate cancellation rule
   */
  async deactivateCancellationRule(id: string): Promise<CancellationRule> {
    return await prisma.cancellationRule.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Get unpaid penalties for a customer
   */
  async getCustomerUnpaidPenalties(customerId: string): Promise<NoShowPenalty[]> {
    return await prisma.noShowPenalty.findMany({
      where: {
        customerId,
        isPaid: false
      },
      include: {
        appointment: {
          include: {
            resource: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all penalties for a customer
   */
  async getCustomerPenalties(customerId: string): Promise<NoShowPenalty[]> {
    return await prisma.noShowPenalty.findMany({
      where: { customerId },
      include: {
        appointment: {
          include: {
            resource: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Mark penalty as paid
   */
  async markPenaltyPaid(penaltyId: string): Promise<NoShowPenalty> {
    return await prisma.noShowPenalty.update({
      where: { id: penaltyId },
      data: {
        isPaid: true,
        paidAt: new Date()
      }
    });
  }

  /**
   * Get penalty by ID
   */
  async getPenaltyById(id: string): Promise<NoShowPenalty | null> {
    return await prisma.noShowPenalty.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            resource: true,
            customer: true
          }
        }
      }
    });
  }

  /**
   * Calculate total unpaid penalties for a customer
   */
  async calculateCustomerUnpaidTotal(customerId: string): Promise<number> {
    const penalties = await this.getCustomerUnpaidPenalties(customerId);
    return penalties.reduce((sum, penalty) => sum + Number(penalty.amount), 0);
  }

  /**
   * Get penalty statistics
   */
  async getPenaltyStatistics() {
    const totalPenalties = await prisma.noShowPenalty.count();
    const paidPenalties = await prisma.noShowPenalty.count({
      where: { isPaid: true }
    });
    const unpaidPenalties = totalPenalties - paidPenalties;

    const totalAmount = await prisma.noShowPenalty.aggregate({
      _sum: { amount: true }
    });

    const paidAmount = await prisma.noShowPenalty.aggregate({
      where: { isPaid: true },
      _sum: { amount: true }
    });

    return {
      totalPenalties,
      paidPenalties,
      unpaidPenalties,
      totalAmount: Number(totalAmount._sum.amount || 0),
      paidAmount: Number(paidAmount._sum.amount || 0),
      unpaidAmount: Number(totalAmount._sum.amount || 0) - Number(paidAmount._sum.amount || 0)
    };
  }

  /**
   * Waive (forgive) a penalty
   */
  async waivePenalty(penaltyId: string): Promise<NoShowPenalty> {
    const penalty = await prisma.noShowPenalty.findUnique({
      where: { id: penaltyId }
    });

    if (!penalty) {
      throw new Error('Penalty not found');
    }

    return await prisma.$transaction(async (tx) => {
      // Mark as paid (waived)
      const updated = await tx.noShowPenalty.update({
        where: { id: penaltyId },
        data: {
          isPaid: true,
          paidAt: new Date()
        }
      });

      // Reduce customer's total penalty
      await tx.customer.update({
        where: { id: penalty.customerId },
        data: {
          totalPenalty: {
            decrement: Number(penalty.amount)
          }
        }
      });

      return updated;
    });
  }
}

export default new PenaltyService();
