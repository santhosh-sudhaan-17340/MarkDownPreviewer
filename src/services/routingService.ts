import prisma from '../config/database';
import { TicketPriority } from '@prisma/client';

export class RoutingService {
  /**
   * Find the best available agent for a ticket based on skills and workload
   */
  static async findBestAgent(requiredSkillId?: string, priority?: TicketPriority): Promise<string | null> {
    if (!requiredSkillId) {
      return this.findGeneralAgent(priority);
    }

    // Find agents with the required skill
    const agentsWithSkill = await prisma.agentSkill.findMany({
      where: {
        skillId: requiredSkillId,
        user: {
          role: 'AGENT',
        },
      },
      include: {
        user: {
          include: {
            ticketsAssigned: {
              where: {
                status: {
                  notIn: ['RESOLVED', 'CLOSED'],
                },
              },
            },
          },
        },
      },
      orderBy: {
        proficiency: 'desc',
      },
    });

    if (agentsWithSkill.length === 0) {
      console.warn(`No agents found with skill ID: ${requiredSkillId}`);
      return this.findGeneralAgent(priority);
    }

    // Calculate workload and find best agent
    let bestAgent = null;
    let lowestWorkload = Infinity;

    for (const agentSkill of agentsWithSkill) {
      const workload = agentSkill.user.ticketsAssigned.length;

      // Prefer agents with higher proficiency and lower workload
      const score = workload - (agentSkill.proficiency * 0.5);

      if (score < lowestWorkload) {
        lowestWorkload = score;
        bestAgent = agentSkill.user;
      }
    }

    return bestAgent?.id || null;
  }

  /**
   * Find a general agent (no specific skill required)
   */
  static async findGeneralAgent(priority?: TicketPriority): Promise<string | null> {
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
      },
      include: {
        ticketsAssigned: {
          where: {
            status: {
              notIn: ['RESOLVED', 'CLOSED'],
            },
          },
        },
      },
    });

    if (agents.length === 0) {
      return null;
    }

    // Find agent with lowest workload
    let bestAgent = agents[0];
    let lowestWorkload = bestAgent.ticketsAssigned.length;

    for (const agent of agents) {
      const workload = agent.ticketsAssigned.length;

      // For critical tickets, prefer less loaded agents even more
      const weight = priority === TicketPriority.CRITICAL ? 2 : 1;

      if (workload * weight < lowestWorkload) {
        lowestWorkload = workload;
        bestAgent = agent;
      }
    }

    return bestAgent.id;
  }

  /**
   * Reassign ticket to a different agent
   */
  static async reassignTicket(ticketId: string): Promise<string | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return null;
    }

    const newAgentId = await this.findBestAgent(
      ticket.requiredSkillId || undefined,
      ticket.priority
    );

    if (newAgentId && newAgentId !== ticket.assignedToId) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { assignedToId: newAgentId },
      });
    }

    return newAgentId;
  }

  /**
   * Balance workload across all agents
   */
  static async balanceWorkload(): Promise<void> {
    const unassignedTickets = await prisma.ticket.findMany({
      where: {
        assignedToId: null,
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    console.log(`Balancing workload for ${unassignedTickets.length} unassigned tickets...`);

    for (const ticket of unassignedTickets) {
      const agentId = await this.findBestAgent(
        ticket.requiredSkillId || undefined,
        ticket.priority
      );

      if (agentId) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { assignedToId: agentId },
        });
      }
    }
  }
}
