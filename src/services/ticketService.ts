import prisma from '../config/database';
import { CreateTicketDto, UpdateTicketDto, AddCommentDto, TicketFilters } from '../types';
import { TicketStatus } from '@prisma/client';
import { SLAService } from './slaService';
import { RoutingService } from './routingService';
import { AuditService } from './auditService';

export class TicketService {
  /**
   * Generate unique ticket number
   */
  private static async generateTicketNumber(): Promise<string> {
    const count = await prisma.ticket.count();
    const number = (count + 1).toString().padStart(6, '0');
    return `TCK-${number}`;
  }

  /**
   * Create a new ticket
   */
  static async createTicket(data: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber();

    // Calculate SLA deadlines
    const slaData = SLAService.calculateSLADeadlines(new Date(), data.priority);

    // Find best agent for assignment
    const assignedToId = await RoutingService.findBestAgent(
      data.requiredSkillId,
      data.priority
    );

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: data.title,
        description: data.description,
        priority: data.priority,
        createdById: data.createdById,
        assignedToId,
        requiredSkillId: data.requiredSkillId,
        ...slaData,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requiredSkill: true,
      },
    });

    // Create initial status history
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        toStatus: TicketStatus.NEW,
      },
    });

    // Create audit log
    await AuditService.log({
      ticketId: ticket.id,
      userId: data.createdById,
      action: 'TICKET_CREATED',
      entityType: 'Ticket',
      entityId: ticket.id,
      changes: { ticket },
    });

    return ticket;
  }

  /**
   * Get ticket by ID
   */
  static async getTicket(ticketId: string) {
    return await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        requiredSkill: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
        escalations: {
          include: {
            escalatedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { escalatedAt: 'desc' },
        },
        slaBreaches: {
          orderBy: { breachedAt: 'desc' },
        },
      },
    });
  }

  /**
   * List tickets with filters
   */
  static async listTickets(filters: TicketFilters, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.requiredSkillId) where.requiredSkillId = filters.requiredSkillId;
    if (filters.responseSLAStatus) where.responseSLAStatus = filters.responseSLAStatus;
    if (filters.resolutionSLAStatus) where.resolutionSLAStatus = filters.resolutionSLAStatus;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          requiredSkill: true,
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update ticket
   */
  static async updateTicket(ticketId: string, data: UpdateTicketDto, userId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const updates: any = {};

    if (data.title) updates.title = data.title;
    if (data.description) updates.description = data.description;
    if (data.priority) updates.priority = data.priority;
    if (data.assignedToId !== undefined) updates.assignedToId = data.assignedToId;

    if (data.status) {
      updates.status = data.status;

      // Track status change
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId,
          fromStatus: ticket.status,
          toStatus: data.status,
        },
      });

      // Update SLA timestamps
      if (data.status === TicketStatus.IN_PROGRESS && !ticket.firstResponseAt) {
        updates.firstResponseAt = new Date();
        updates.responseSLAStatus = 'MET';
      }

      if (data.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        updates.resolvedAt = new Date();

        // Check if resolution was within SLA
        const now = new Date();
        if (ticket.resolutionSLADeadline && now <= ticket.resolutionSLADeadline) {
          updates.resolutionSLAStatus = 'MET';
        }
      }

      if (data.status === TicketStatus.CLOSED && !ticket.closedAt) {
        updates.closedAt = new Date();
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updates,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await AuditService.log({
      ticketId,
      userId,
      action: 'TICKET_UPDATED',
      entityType: 'Ticket',
      entityId: ticketId,
      changes: {
        before: ticket,
        after: updates,
      },
    });

    return updatedTicket;
  }

  /**
   * Add comment to ticket
   */
  static async addComment(data: AddCommentDto) {
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: data.ticketId,
        userId: data.userId,
        content: data.content,
        isInternal: data.isInternal || false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Update first response time if this is the first agent comment
    const ticket = await prisma.ticket.findUnique({
      where: { id: data.ticketId },
      include: {
        createdBy: true,
      },
    });

    if (ticket && !ticket.firstResponseAt && data.userId !== ticket.createdById) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (user?.role === 'AGENT' || user?.role === 'ADMIN') {
        await prisma.ticket.update({
          where: { id: data.ticketId },
          data: {
            firstResponseAt: new Date(),
            responseSLAStatus: 'MET',
          },
        });
      }
    }

    // Create audit log
    await AuditService.log({
      ticketId: data.ticketId,
      userId: data.userId,
      action: 'COMMENT_ADDED',
      entityType: 'TicketComment',
      entityId: comment.id,
      changes: { comment },
    });

    return comment;
  }

  /**
   * Delete ticket (soft delete by closing)
   */
  static async deleteTicket(ticketId: string, userId: string) {
    const ticket = await this.updateTicket(
      ticketId,
      { status: TicketStatus.CLOSED },
      userId
    );

    await AuditService.log({
      ticketId,
      userId,
      action: 'TICKET_DELETED',
      entityType: 'Ticket',
      entityId: ticketId,
    });

    return ticket;
  }
}
