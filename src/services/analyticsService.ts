import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class AnalyticsService {
  /**
   * Get ticket backlog count by status and priority
   */
  static async getBacklogCount() {
    // SQL query for backlog counts
    const backlogByStatus = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT status, COUNT(*) as count
      FROM "Ticket"
      WHERE status NOT IN ('RESOLVED', 'CLOSED')
      GROUP BY status
      ORDER BY count DESC
    `;

    const backlogByPriority = await prisma.$queryRaw<Array<{ priority: string; count: bigint }>>`
      SELECT priority, COUNT(*) as count
      FROM "Ticket"
      WHERE status NOT IN ('RESOLVED', 'CLOSED')
      GROUP BY priority
      ORDER BY
        CASE priority
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END
    `;

    const totalBacklog = await prisma.ticket.count({
      where: {
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
      },
    });

    return {
      total: totalBacklog,
      byStatus: backlogByStatus.map((row) => ({
        status: row.status,
        count: Number(row.count),
      })),
      byPriority: backlogByPriority.map((row) => ({
        priority: row.priority,
        count: Number(row.count),
      })),
    };
  }

  /**
   * Get SLA breach statistics
   */
  static async getSLABreaches(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate
      ? Prisma.sql`AND sb."breachedAt" BETWEEN ${startDate} AND ${endDate}`
      : Prisma.empty;

    // SQL query for SLA breaches
    const breachesByType = await prisma.$queryRaw<Array<{ breachType: string; count: bigint; avgDuration: number }>>`
      SELECT
        "breachType",
        COUNT(*) as count,
        AVG("breachDurationMinutes") as "avgDuration"
      FROM "SLABreach" sb
      WHERE 1=1 ${dateFilter}
      GROUP BY "breachType"
    `;

    const breachesByPriority = await prisma.$queryRaw<Array<{ priority: string; count: bigint }>>`
      SELECT
        t.priority,
        COUNT(DISTINCT sb.id) as count
      FROM "SLABreach" sb
      INNER JOIN "Ticket" t ON t.id = sb."ticketId"
      WHERE 1=1 ${dateFilter}
      GROUP BY t.priority
      ORDER BY
        CASE t.priority
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END
    `;

    const totalBreaches = await prisma.sLABreach.count({
      where: startDate && endDate ? {
        breachedAt: {
          gte: startDate,
          lte: endDate,
        },
      } : {},
    });

    // Current tickets at risk
    const ticketsAtRisk = await prisma.ticket.count({
      where: {
        OR: [
          { responseSLAStatus: 'AT_RISK' },
          { resolutionSLAStatus: 'AT_RISK' },
        ],
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
      },
    });

    return {
      total: totalBreaches,
      ticketsAtRisk,
      byType: breachesByType.map((row) => ({
        breachType: row.breachType,
        count: Number(row.count),
        avgDuration: Number(row.avgDuration.toFixed(2)),
      })),
      byPriority: breachesByPriority.map((row) => ({
        priority: row.priority,
        count: Number(row.count),
      })),
    };
  }

  /**
   * Get agent productivity metrics
   */
  static async getAgentProductivity(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate
      ? Prisma.sql`AND t."createdAt" BETWEEN ${startDate} AND ${endDate}`
      : Prisma.empty;

    // SQL query for agent productivity
    const agentStats = await prisma.$queryRaw<Array<{
      agentId: string;
      agentName: string;
      agentEmail: string;
      totalAssigned: bigint;
      totalResolved: bigint;
      totalClosed: bigint;
      avgResolutionTime: number;
      slaBreachCount: bigint;
    }>>`
      SELECT
        u.id as "agentId",
        u.name as "agentName",
        u.email as "agentEmail",
        COUNT(t.id) as "totalAssigned",
        COUNT(CASE WHEN t.status = 'RESOLVED' THEN 1 END) as "totalResolved",
        COUNT(CASE WHEN t.status = 'CLOSED' THEN 1 END) as "totalClosed",
        AVG(
          CASE
            WHEN t."resolvedAt" IS NOT NULL THEN
              EXTRACT(EPOCH FROM (t."resolvedAt" - t."createdAt")) / 60
            ELSE NULL
          END
        ) as "avgResolutionTime",
        COUNT(CASE WHEN t."resolutionSLAStatus" = 'BREACHED' THEN 1 END) as "slaBreachCount"
      FROM "User" u
      LEFT JOIN "Ticket" t ON t."assignedToId" = u.id ${dateFilter}
      WHERE u.role = 'AGENT'
      GROUP BY u.id, u.name, u.email
      ORDER BY "totalResolved" DESC
    `;

    return agentStats.map((agent) => ({
      agentId: agent.agentId,
      agentName: agent.agentName,
      agentEmail: agent.agentEmail,
      totalAssigned: Number(agent.totalAssigned),
      totalResolved: Number(agent.totalResolved),
      totalClosed: Number(agent.totalClosed),
      avgResolutionTimeMinutes: agent.avgResolutionTime ? Number(agent.avgResolutionTime.toFixed(2)) : 0,
      slaBreachCount: Number(agent.slaBreachCount),
      resolutionRate: agent.totalAssigned > 0
        ? Number(((Number(agent.totalResolved) / Number(agent.totalAssigned)) * 100).toFixed(2))
        : 0,
    }));
  }

  /**
   * Get ticket resolution time distribution
   */
  static async getResolutionTimeDistribution() {
    const distribution = await prisma.$queryRaw<Array<{ bucket: string; count: bigint }>>`
      SELECT
        CASE
          WHEN EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600 < 1 THEN 'Under 1 hour'
          WHEN EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600 < 4 THEN '1-4 hours'
          WHEN EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600 < 24 THEN '4-24 hours'
          WHEN EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600 < 72 THEN '1-3 days'
          ELSE 'Over 3 days'
        END as bucket,
        COUNT(*) as count
      FROM "Ticket"
      WHERE "resolvedAt" IS NOT NULL
      GROUP BY bucket
      ORDER BY
        CASE bucket
          WHEN 'Under 1 hour' THEN 1
          WHEN '1-4 hours' THEN 2
          WHEN '4-24 hours' THEN 3
          WHEN '1-3 days' THEN 4
          WHEN 'Over 3 days' THEN 5
        END
    `;

    return distribution.map((row) => ({
      bucket: row.bucket,
      count: Number(row.count),
    }));
  }

  /**
   * Get overall system metrics
   */
  static async getSystemMetrics() {
    const totalTickets = await prisma.ticket.count();
    const openTickets = await prisma.ticket.count({
      where: { status: { notIn: ['RESOLVED', 'CLOSED'] } },
    });
    const resolvedTickets = await prisma.ticket.count({
      where: { status: 'RESOLVED' },
    });
    const closedTickets = await prisma.ticket.count({
      where: { status: 'CLOSED' },
    });

    const avgResolutionTime = await prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60) as avg
      FROM "Ticket"
      WHERE "resolvedAt" IS NOT NULL
    `;

    const avgFirstResponseTime = await prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60) as avg
      FROM "Ticket"
      WHERE "firstResponseAt" IS NOT NULL
    `;

    const slaComplianceRate = await prisma.$queryRaw<Array<{ rate: number }>>`
      SELECT
        (COUNT(CASE WHEN "resolutionSLAStatus" = 'MET' THEN 1 END)::float /
         NULLIF(COUNT(CASE WHEN status IN ('RESOLVED', 'CLOSED') THEN 1 END), 0) * 100) as rate
      FROM "Ticket"
    `;

    return {
      totalTickets,
      openTickets,
      resolvedTickets,
      closedTickets,
      avgResolutionTimeMinutes: avgResolutionTime[0]?.avg ? Number(avgResolutionTime[0].avg.toFixed(2)) : 0,
      avgFirstResponseTimeMinutes: avgFirstResponseTime[0]?.avg ? Number(avgFirstResponseTime[0].avg.toFixed(2)) : 0,
      slaComplianceRate: slaComplianceRate[0]?.rate ? Number(slaComplianceRate[0].rate.toFixed(2)) : 0,
      resolutionRate: totalTickets > 0 ? Number(((resolvedTickets / totalTickets) * 100).toFixed(2)) : 0,
    };
  }

  /**
   * Get ticket trends over time
   */
  static async getTicketTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await prisma.$queryRaw<Array<{ date: Date; created: bigint; resolved: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as created,
        COUNT(CASE WHEN "resolvedAt" IS NOT NULL AND DATE("resolvedAt") = DATE("createdAt") THEN 1 END) as resolved
      FROM "Ticket"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    return trends.map((row) => ({
      date: row.date,
      created: Number(row.created),
      resolved: Number(row.resolved),
    }));
  }

  /**
   * Get skill-based metrics
   */
  static async getSkillMetrics() {
    const skillStats = await prisma.$queryRaw<Array<{
      skillId: string;
      skillName: string;
      totalTickets: bigint;
      avgResolutionTime: number;
      agentCount: bigint;
    }>>`
      SELECT
        s.id as "skillId",
        s.name as "skillName",
        COUNT(DISTINCT t.id) as "totalTickets",
        AVG(
          CASE
            WHEN t."resolvedAt" IS NOT NULL THEN
              EXTRACT(EPOCH FROM (t."resolvedAt" - t."createdAt")) / 60
            ELSE NULL
          END
        ) as "avgResolutionTime",
        COUNT(DISTINCT as2."userId") as "agentCount"
      FROM "Skill" s
      LEFT JOIN "Ticket" t ON t."requiredSkillId" = s.id
      LEFT JOIN "AgentSkill" as2 ON as2."skillId" = s.id
      GROUP BY s.id, s.name
      ORDER BY "totalTickets" DESC
    `;

    return skillStats.map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skillName,
      totalTickets: Number(skill.totalTickets),
      avgResolutionTimeMinutes: skill.avgResolutionTime ? Number(skill.avgResolutionTime.toFixed(2)) : 0,
      agentCount: Number(skill.agentCount),
    }));
  }
}
