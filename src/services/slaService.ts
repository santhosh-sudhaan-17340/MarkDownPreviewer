import prisma from '../config/database';
import { TicketPriority, SLAStatus, EscalationLevel } from '@prisma/client';
import { AuditService } from './auditService';

export class SLAService {
  /**
   * Get SLA time limits based on priority
   */
  static getSLALimits(priority: TicketPriority): { response: number; resolution: number } {
    const limits = {
      CRITICAL: { response: parseInt(process.env.CRITICAL_RESPONSE_SLA || '15'), resolution: parseInt(process.env.CRITICAL_RESOLUTION_SLA || '120') },
      HIGH: { response: parseInt(process.env.HIGH_RESPONSE_SLA || '30'), resolution: parseInt(process.env.HIGH_RESOLUTION_SLA || '240') },
      MEDIUM: { response: parseInt(process.env.MEDIUM_RESPONSE_SLA || '60'), resolution: parseInt(process.env.MEDIUM_RESOLUTION_SLA || '480') },
      LOW: { response: parseInt(process.env.LOW_RESPONSE_SLA || '120'), resolution: parseInt(process.env.LOW_RESOLUTION_SLA || '960') },
    };

    return limits[priority] || limits.MEDIUM;
  }

  /**
   * Calculate SLA deadlines for a ticket
   */
  static calculateSLADeadlines(createdAt: Date, priority: TicketPriority) {
    const limits = this.getSLALimits(priority);

    const responseSLADeadline = new Date(createdAt.getTime() + limits.response * 60000);
    const resolutionSLADeadline = new Date(createdAt.getTime() + limits.resolution * 60000);

    return {
      responseSLAMinutes: limits.response,
      resolutionSLAMinutes: limits.resolution,
      responseSLADeadline,
      resolutionSLADeadline,
    };
  }

  /**
   * Check and update SLA status for a ticket
   */
  static async updateSLAStatus(ticketId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) return;

    const now = new Date();
    let updates: any = {};

    // Check response SLA
    if (!ticket.firstResponseAt && ticket.responseSLADeadline) {
      const timeUntilDeadline = ticket.responseSLADeadline.getTime() - now.getTime();
      const minutesUntilDeadline = timeUntilDeadline / 60000;

      if (timeUntilDeadline < 0) {
        updates.responseSLAStatus = SLAStatus.BREACHED;

        // Create SLA breach record
        await prisma.sLABreach.create({
          data: {
            ticketId,
            breachType: 'RESPONSE',
            slaDeadline: ticket.responseSLADeadline,
            breachDurationMinutes: Math.abs(minutesUntilDeadline),
          },
        });
      } else if (minutesUntilDeadline <= ticket.responseSLAMinutes * 0.2) {
        updates.responseSLAStatus = SLAStatus.AT_RISK;
      }
    }

    // Check resolution SLA
    if (!ticket.resolvedAt && ticket.resolutionSLADeadline) {
      const timeUntilDeadline = ticket.resolutionSLADeadline.getTime() - now.getTime();
      const minutesUntilDeadline = timeUntilDeadline / 60000;

      if (timeUntilDeadline < 0) {
        updates.resolutionSLAStatus = SLAStatus.BREACHED;

        // Create SLA breach record if not exists
        const existingBreach = await prisma.sLABreach.findFirst({
          where: {
            ticketId,
            breachType: 'RESOLUTION',
          },
        });

        if (!existingBreach) {
          await prisma.sLABreach.create({
            data: {
              ticketId,
              breachType: 'RESOLUTION',
              slaDeadline: ticket.resolutionSLADeadline,
              breachDurationMinutes: Math.abs(minutesUntilDeadline),
            },
          });
        }
      } else if (minutesUntilDeadline <= ticket.resolutionSLAMinutes * 0.2) {
        updates.resolutionSLAStatus = SLAStatus.AT_RISK;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: updates,
      });

      await AuditService.log({
        ticketId,
        action: 'SLA_STATUS_UPDATED',
        entityType: 'Ticket',
        entityId: ticketId,
        changes: updates,
      });
    }
  }

  /**
   * Auto-escalate tickets based on SLA breaches
   */
  static async checkAndEscalate(ticketId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        escalations: {
          orderBy: { escalatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!ticket) return;

    // Escalation rules
    const shouldEscalate =
      ticket.resolutionSLAStatus === SLAStatus.BREACHED ||
      (ticket.priority === TicketPriority.CRITICAL && ticket.responseSLAStatus === SLAStatus.AT_RISK);

    if (shouldEscalate) {
      const currentLevel = ticket.escalations[0]?.level || null;
      let newLevel: EscalationLevel;

      // Determine escalation level
      if (!currentLevel) {
        newLevel = EscalationLevel.L2;
      } else if (currentLevel === EscalationLevel.L2) {
        newLevel = EscalationLevel.L3;
      } else if (currentLevel === EscalationLevel.L3) {
        newLevel = EscalationLevel.MANAGEMENT;
      } else {
        return; // Already at max escalation
      }

      await prisma.ticketEscalation.create({
        data: {
          ticketId,
          level: newLevel,
          reason: `SLA breach or at risk - Priority: ${ticket.priority}`,
          escalatedById: ticket.assignedToId || ticket.createdById,
        },
      });

      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'ESCALATED' },
      });

      await AuditService.log({
        ticketId,
        action: 'TICKET_ESCALATED',
        entityType: 'Ticket',
        entityId: ticketId,
        changes: { level: newLevel },
      });
    }
  }

  /**
   * Monitor all tickets for SLA compliance
   */
  static async monitorAllTickets(): Promise<void> {
    const activeTickets = await prisma.ticket.findMany({
      where: {
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
      },
      select: { id: true },
    });

    console.log(`Monitoring ${activeTickets.length} active tickets for SLA compliance...`);

    for (const ticket of activeTickets) {
      try {
        await this.updateSLAStatus(ticket.id);
        await this.checkAndEscalate(ticket.id);
      } catch (error) {
        console.error(`Error monitoring ticket ${ticket.id}:`, error);
      }
    }

    console.log('SLA monitoring completed.');
  }
}
