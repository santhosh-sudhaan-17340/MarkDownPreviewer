import { Customer } from '@prisma/client';
import prisma from '../database/client';

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone: string;
}

export class CustomerService {
  /**
   * Create a new customer
   */
  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    return await prisma.customer.create({
      data: input
    });
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    return await prisma.customer.findUnique({
      where: { id },
      include: {
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 10
        },
        penalties: {
          where: { isPaid: false }
        }
      }
    });
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<Customer | null> {
    return await prisma.customer.findUnique({
      where: { email }
    });
  }

  /**
   * Update customer
   */
  async updateCustomer(
    id: string,
    data: Partial<CreateCustomerInput>
  ): Promise<Customer> {
    return await prisma.customer.update({
      where: { id },
      data
    });
  }

  /**
   * Increment no-show count
   */
  async incrementNoShowCount(customerId: string): Promise<Customer> {
    return await prisma.customer.update({
      where: { id: customerId },
      data: {
        noShowCount: {
          increment: 1
        }
      }
    });
  }

  /**
   * Add penalty to customer
   */
  async addPenalty(customerId: string, amount: number): Promise<Customer> {
    return await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalPenalty: {
          increment: amount
        }
      }
    });
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        appointments: {
          select: {
            status: true
          }
        },
        penalties: {
          where: { isPaid: false }
        }
      }
    });

    if (!customer) {
      return null;
    }

    const totalAppointments = customer.appointments.length;
    const completedAppointments = customer.appointments.filter(
      a => a.status === 'COMPLETED'
    ).length;
    const cancelledAppointments = customer.appointments.filter(
      a => a.status === 'CANCELLED'
    ).length;
    const noShowAppointments = customer.appointments.filter(
      a => a.status === 'NO_SHOW'
    ).length;

    const unpaidPenalties = customer.penalties.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    return {
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      noShowCount: customer.noShowCount,
      totalPenalty: Number(customer.totalPenalty),
      unpaidPenalties
    };
  }
}

export default new CustomerService();
