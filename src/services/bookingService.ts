import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import prisma from '../database/client';
import { addHours, isBefore, isAfter } from 'date-fns';

export interface CreateAppointmentInput {
  resourceId: string;
  customerId: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

export class BookingService {
  /**
   * Create a new appointment with proper locking to prevent conflicts
   * Uses database transactions and row-level locking
   */
  async createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    // Validate that end time is after start time
    if (!isAfter(input.endTime, input.startTime)) {
      throw new Error('End time must be after start time');
    }

    // Validate that appointment is in the future
    if (isBefore(input.startTime, new Date())) {
      throw new Error('Cannot book appointments in the past');
    }

    // Use a transaction with serializable isolation level for maximum safety
    const appointment = await prisma.$transaction(
      async (tx) => {
        // Lock and check for conflicts using FOR UPDATE
        // This prevents concurrent bookings for the same resource and time
        const conflictingAppointments = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Appointment"
          WHERE "resourceId" = ${input.resourceId}
            AND status NOT IN ('CANCELLED', 'NO_SHOW')
            AND (
              ("startTime" <= ${input.startTime} AND "endTime" > ${input.startTime})
              OR ("startTime" < ${input.endTime} AND "endTime" >= ${input.endTime})
              OR ("startTime" >= ${input.startTime} AND "endTime" <= ${input.endTime})
            )
          FOR UPDATE
        `;

        if (conflictingAppointments.length > 0) {
          throw new Error('Time slot is already booked. Please choose another time.');
        }

        // Verify resource exists and is active
        const resource = await tx.resource.findUnique({
          where: { id: input.resourceId },
          select: { isActive: true }
        });

        if (!resource) {
          throw new Error('Resource not found');
        }

        if (!resource.isActive) {
          throw new Error('Resource is not available');
        }

        // Verify customer exists
        const customer = await tx.customer.findUnique({
          where: { id: input.customerId }
        });

        if (!customer) {
          throw new Error('Customer not found');
        }

        // Create the appointment
        return await tx.appointment.create({
          data: {
            resourceId: input.resourceId,
            customerId: input.customerId,
            startTime: input.startTime,
            endTime: input.endTime,
            notes: input.notes,
            status: 'CONFIRMED'
          },
          include: {
            resource: true,
            customer: true
          }
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000, // Wait max 5 seconds to acquire transaction
        timeout: 10000 // Transaction timeout of 10 seconds
      }
    );

    return appointment;
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(id: string): Promise<Appointment | null> {
    return await prisma.appointment.findUnique({
      where: { id },
      include: {
        resource: true,
        customer: true,
        reminders: true
      }
    });
  }

  /**
   * Get appointments for a resource within a date range
   */
  async getResourceAppointments(
    resourceId: string,
    startDate: Date,
    endDate: Date,
    includeStatuses: AppointmentStatus[] = ['CONFIRMED', 'PENDING']
  ): Promise<Appointment[]> {
    return await prisma.appointment.findMany({
      where: {
        resourceId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: { in: includeStatuses }
      },
      include: {
        customer: true
      },
      orderBy: { startTime: 'asc' }
    });
  }

  /**
   * Get appointments for a customer
   */
  async getCustomerAppointments(
    customerId: string,
    futureOnly: boolean = false
  ): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = {
      customerId
    };

    if (futureOnly) {
      where.startTime = { gte: new Date() };
      where.status = { notIn: ['CANCELLED', 'NO_SHOW'] };
    }

    return await prisma.appointment.findMany({
      where,
      include: {
        resource: true,
        reminders: true
      },
      orderBy: { startTime: 'desc' }
    });
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    appointmentId: string,
    cancellationWindowHours: number = 24
  ): Promise<{ appointment: Appointment; penaltyApplied: boolean; penaltyAmount?: number }> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status === 'CANCELLED') {
      throw new Error('Appointment is already cancelled');
    }

    if (appointment.status === 'COMPLETED') {
      throw new Error('Cannot cancel a completed appointment');
    }

    const now = new Date();
    const cancellationDeadline = addHours(appointment.startTime, -cancellationWindowHours);
    const isLateCancellation = isAfter(now, cancellationDeadline);

    let penaltyAmount: number | undefined;
    let penaltyApplied = false;

    // Update appointment status in a transaction
    const updatedAppointment = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
        include: { customer: true }
      });

      // Apply late cancellation penalty if applicable
      if (isLateCancellation) {
        const penalty = Number(process.env.LATE_CANCELLATION_PENALTY || 15);

        await tx.noShowPenalty.create({
          data: {
            appointmentId,
            customerId: appointment.customerId,
            amount: penalty
          }
        });

        await tx.customer.update({
          where: { id: appointment.customerId },
          data: {
            totalPenalty: {
              increment: penalty
            }
          }
        });

        penaltyAmount = penalty;
        penaltyApplied = true;
      }

      return updated;
    });

    return {
      appointment: updatedAppointment,
      penaltyApplied,
      penaltyAmount
    };
  }

  /**
   * Mark appointment as no-show and apply penalty
   */
  async markNoShow(
    appointmentId: string,
    penaltyAmount: number = 25
  ): Promise<Appointment> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return await prisma.$transaction(async (tx) => {
      // Update appointment status
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'NO_SHOW' }
      });

      // Create penalty record
      await tx.noShowPenalty.create({
        data: {
          appointmentId,
          customerId: appointment.customerId,
          amount: penaltyAmount
        }
      });

      // Update customer stats
      await tx.customer.update({
        where: { id: appointment.customerId },
        data: {
          noShowCount: { increment: 1 },
          totalPenalty: { increment: penaltyAmount }
        }
      });

      return updated;
    });
  }

  /**
   * Mark appointment as completed
   */
  async completeAppointment(appointmentId: string): Promise<Appointment> {
    return await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' }
    });
  }

  /**
   * Reschedule an appointment (cancel and create new)
   */
  async rescheduleAppointment(
    appointmentId: string,
    newStartTime: Date,
    newEndTime: Date
  ): Promise<Appointment> {
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!existingAppointment) {
      throw new Error('Appointment not found');
    }

    if (existingAppointment.status !== 'CONFIRMED' && existingAppointment.status !== 'PENDING') {
      throw new Error('Cannot reschedule this appointment');
    }

    return await prisma.$transaction(async (tx) => {
      // Cancel old appointment without penalty (internal reschedule)
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' }
      });

      // Create new appointment
      const newAppointment = await this.createAppointment({
        resourceId: existingAppointment.resourceId,
        customerId: existingAppointment.customerId,
        startTime: newStartTime,
        endTime: newEndTime,
        notes: existingAppointment.notes || undefined
      });

      return newAppointment;
    });
  }
}

export default new BookingService();
