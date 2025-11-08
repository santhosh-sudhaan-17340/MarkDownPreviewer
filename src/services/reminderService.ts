import { Reminder, ReminderStatus } from '@prisma/client';
import prisma from '../database/client';
import { subHours, isBefore } from 'date-fns';
import * as cron from 'node-cron';

export interface CreateReminderInput {
  appointmentId: string;
  scheduledFor: Date;
  message?: string;
}

export class ReminderService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Create a reminder for an appointment
   */
  async createReminder(input: CreateReminderInput): Promise<Reminder> {
    // Validate appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Validate reminder time is before appointment
    if (!isBefore(input.scheduledFor, appointment.startTime)) {
      throw new Error('Reminder must be scheduled before the appointment');
    }

    return await prisma.reminder.create({
      data: input
    });
  }

  /**
   * Create reminders for an appointment based on configured intervals
   * @param appointmentId The appointment ID
   * @param hoursBefore Array of hours before appointment to send reminders (e.g., [24, 2])
   */
  async createAppointmentReminders(
    appointmentId: string,
    hoursBefore: number[] = [24, 2]
  ): Promise<Reminder[]> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true, resource: true }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const reminders: Reminder[] = [];

    for (const hours of hoursBefore) {
      const scheduledFor = subHours(appointment.startTime, hours);

      // Only create reminder if it's in the future
      if (isAfter(scheduledFor, new Date())) {
        const message = this.generateReminderMessage(appointment, hours);

        const reminder = await this.createReminder({
          appointmentId,
          scheduledFor,
          message
        });

        reminders.push(reminder);
      }
    }

    return reminders;
  }

  /**
   * Generate a reminder message
   */
  private generateReminderMessage(appointment: any, hoursBefore: number): string {
    const timeUntil = hoursBefore === 1 ? '1 hour' : `${hoursBefore} hours`;
    return `Reminder: You have an appointment in ${timeUntil} at ${appointment.startTime.toLocaleString()}`;
  }

  /**
   * Get pending reminders that should be sent
   */
  async getPendingReminders(beforeDate: Date = new Date()): Promise<Reminder[]> {
    return await prisma.reminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: beforeDate }
      },
      include: {
        appointment: {
          include: {
            customer: true,
            resource: true
          }
        }
      },
      orderBy: { scheduledFor: 'asc' }
    });
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(reminderId: string): Promise<Reminder> {
    return await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    });
  }

  /**
   * Mark reminder as failed
   */
  async markReminderFailed(reminderId: string): Promise<Reminder> {
    return await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: 'FAILED' }
    });
  }

  /**
   * Process and send pending reminders
   * This would integrate with email/SMS service in production
   */
  async processPendingReminders(): Promise<{
    sent: number;
    failed: number;
  }> {
    const pendingReminders = await this.getPendingReminders();

    let sent = 0;
    let failed = 0;

    for (const reminder of pendingReminders) {
      try {
        // In production, integrate with email/SMS service here
        console.log(`Sending reminder ${reminder.id}:`, reminder.message);
        console.log(`To: ${reminder.appointment.customer.email}`);

        // Simulate sending
        await this.sendReminder(reminder);

        await this.markReminderSent(reminder.id);
        sent++;
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
        await this.markReminderFailed(reminder.id);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send reminder (placeholder for actual implementation)
   * In production, this would integrate with email/SMS services
   */
  private async sendReminder(reminder: Reminder & { appointment: any }): Promise<void> {
    // TODO: Integrate with email service (e.g., SendGrid, AWS SES)
    // TODO: Integrate with SMS service (e.g., Twilio)

    console.log('Reminder sent successfully');

    // For demo purposes, we just log the reminder
    // In production, you would call your notification service here
  }

  /**
   * Start automatic reminder processing
   * Runs every minute to check for pending reminders
   */
  startReminderProcessor(): void {
    if (this.cronJob) {
      console.log('Reminder processor is already running');
      return;
    }

    console.log('Starting reminder processor...');

    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      try {
        const result = await this.processPendingReminders();
        if (result.sent > 0 || result.failed > 0) {
          console.log(`Reminders processed: ${result.sent} sent, ${result.failed} failed`);
        }
      } catch (error) {
        console.error('Error processing reminders:', error);
      }
    });

    console.log('Reminder processor started');
  }

  /**
   * Stop automatic reminder processing
   */
  stopReminderProcessor(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('Reminder processor stopped');
    }
  }

  /**
   * Get reminders for an appointment
   */
  async getAppointmentReminders(appointmentId: string): Promise<Reminder[]> {
    return await prisma.reminder.findMany({
      where: { appointmentId },
      orderBy: { scheduledFor: 'asc' }
    });
  }

  /**
   * Delete reminder
   */
  async deleteReminder(reminderId: string): Promise<Reminder> {
    return await prisma.reminder.delete({
      where: { id: reminderId }
    });
  }
}

// Import isAfter from date-fns
import { isAfter } from 'date-fns';

export default new ReminderService();
