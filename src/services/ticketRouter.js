const { query } = require('../database/connection');
const User = require('../models/User');

class TicketRouter {
  // Find best agent for ticket based on category and workload
  static async findBestAgent(categoryId, priority = 'medium') {
    try {
      // Get category details including required skill
      const categoryResult = await query(
        'SELECT * FROM ticket_categories WHERE id = $1',
        [categoryId]
      );

      if (categoryResult.rows.length === 0) {
        throw new Error('Category not found');
      }

      const category = categoryResult.rows[0];

      // If category requires specific skill, find agents with that skill
      if (category.required_skill_id) {
        return await this.findAgentBySkill(category.required_skill_id, priority);
      }

      // Otherwise, find agent with lowest workload
      return await this.findAgentByWorkload(priority);
    } catch (error) {
      console.error('Error finding best agent:', error);
      throw error;
    }
  }

  // Find agent by required skill and workload
  static async findAgentBySkill(skillId, priority) {
    // Prioritize expert level agents for critical/high priority tickets
    const preferredProficiency = (priority === 'critical' || priority === 'high')
      ? 'expert'
      : 'intermediate';

    const result = await query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        asm.proficiency_level,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as active_tickets,
        COUNT(t.id) FILTER (WHERE t.priority = 'critical' AND t.status NOT IN ('resolved', 'closed')) as critical_tickets,
        COUNT(t.id) FILTER (WHERE t.sla_breached = true AND t.status NOT IN ('resolved', 'closed')) as breached_tickets,
        AVG(
          CASE WHEN t.status IN ('resolved', 'closed')
          THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60
          END
        ) as avg_resolution_time_minutes,
        CASE asm.proficiency_level
          WHEN 'expert' THEN 1
          WHEN 'intermediate' THEN 2
          WHEN 'beginner' THEN 3
        END as proficiency_rank
      FROM users u
      INNER JOIN agent_skill_mapping asm ON u.id = asm.agent_id
      LEFT JOIN tickets t ON u.id = t.assigned_agent_id
      WHERE asm.skill_id = $1
        AND u.is_active = true
        AND u.role = 'agent'
      GROUP BY u.id, u.full_name, u.email, asm.proficiency_level
      ORDER BY
        CASE WHEN asm.proficiency_level = $2 THEN 0 ELSE 1 END,
        proficiency_rank ASC,
        active_tickets ASC,
        critical_tickets ASC,
        breached_tickets ASC
      LIMIT 1
    `, [skillId, preferredProficiency]);

    return result.rows[0] || null;
  }

  // Find agent by workload (for tickets without specific skill requirement)
  static async findAgentByWorkload(priority) {
    const result = await query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as active_tickets,
        COUNT(t.id) FILTER (WHERE t.priority = 'critical' AND t.status NOT IN ('resolved', 'closed')) as critical_tickets,
        COUNT(t.id) FILTER (WHERE t.sla_breached = true AND t.status NOT IN ('resolved', 'closed')) as breached_tickets,
        AVG(
          CASE WHEN t.status IN ('resolved', 'closed')
          THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60
          END
        ) as avg_resolution_time_minutes
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_agent_id
      WHERE u.is_active = true
        AND u.role = 'agent'
      GROUP BY u.id, u.full_name, u.email
      ORDER BY
        active_tickets ASC,
        critical_tickets ASC,
        breached_tickets ASC
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  // Auto-assign ticket based on routing rules
  static async autoAssignTicket(ticketId, categoryId, priority) {
    try {
      const agent = await this.findBestAgent(categoryId, priority);

      if (!agent) {
        console.log(`No available agent found for ticket ${ticketId}`);
        return null;
      }

      const Ticket = require('../models/Ticket');
      await Ticket.assignToAgent(
        ticketId,
        agent.id,
        null, // System assignment
        `Auto-assigned based on ${agent.proficiency_level ? 'skill match and ' : ''}workload balancing`
      );

      console.log(`Ticket ${ticketId} auto-assigned to agent ${agent.full_name}`);
      return agent;
    } catch (error) {
      console.error('Error in auto-assignment:', error);
      throw error;
    }
  }

  // Get routing recommendations for manual assignment
  static async getRoutingRecommendations(categoryId, priority, limit = 5) {
    const categoryResult = await query(
      'SELECT * FROM ticket_categories WHERE id = $1',
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      throw new Error('Category not found');
    }

    const category = categoryResult.rows[0];

    let query_text;
    const params = [];

    if (category.required_skill_id) {
      // Get agents with required skill
      query_text = `
        SELECT
          u.id,
          u.full_name,
          u.email,
          asm.proficiency_level,
          COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as active_tickets,
          COUNT(t.id) FILTER (WHERE t.priority = 'critical' AND t.status NOT IN ('resolved', 'closed')) as critical_tickets,
          AVG(
            CASE WHEN t.status IN ('resolved', 'closed')
            THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60
            END
          ) as avg_resolution_time_minutes,
          ROUND(
            (COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed') AND t.sla_breached = false)::numeric /
            NULLIF(COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')), 0)) * 100,
            2
          ) as sla_compliance_percentage
        FROM users u
        INNER JOIN agent_skill_mapping asm ON u.id = asm.agent_id
        LEFT JOIN tickets t ON u.id = t.assigned_agent_id
        WHERE asm.skill_id = $1
          AND u.is_active = true
          AND u.role = 'agent'
        GROUP BY u.id, u.full_name, u.email, asm.proficiency_level
        ORDER BY
          CASE asm.proficiency_level
            WHEN 'expert' THEN 1
            WHEN 'intermediate' THEN 2
            WHEN 'beginner' THEN 3
          END ASC,
          active_tickets ASC,
          critical_tickets ASC
        LIMIT $2
      `;
      params.push(category.required_skill_id, limit);
    } else {
      // Get all agents sorted by workload
      query_text = `
        SELECT
          u.id,
          u.full_name,
          u.email,
          NULL as proficiency_level,
          COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as active_tickets,
          COUNT(t.id) FILTER (WHERE t.priority = 'critical' AND t.status NOT IN ('resolved', 'closed')) as critical_tickets,
          AVG(
            CASE WHEN t.status IN ('resolved', 'closed')
            THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60
            END
          ) as avg_resolution_time_minutes,
          ROUND(
            (COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed') AND t.sla_breached = false)::numeric /
            NULLIF(COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')), 0)) * 100,
            2
          ) as sla_compliance_percentage
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_agent_id
        WHERE u.is_active = true
          AND u.role = 'agent'
        GROUP BY u.id, u.full_name, u.email
        ORDER BY
          active_tickets ASC,
          critical_tickets ASC
        LIMIT $1
      `;
      params.push(limit);
    }

    const result = await query(query_text, params);
    return result.rows;
  }

  // Rebalance tickets across agents
  static async rebalanceWorkload(maxTicketsPerAgent = 10) {
    try {
      console.log('Starting workload rebalancing...');

      // Find overloaded agents
      const overloadedAgents = await query(`
        SELECT
          u.id as agent_id,
          u.full_name,
          COUNT(t.id) as active_tickets
        FROM users u
        INNER JOIN tickets t ON u.id = t.assigned_agent_id
        WHERE u.role = 'agent'
          AND u.is_active = true
          AND t.status NOT IN ('resolved', 'closed')
        GROUP BY u.id, u.full_name
        HAVING COUNT(t.id) > $1
        ORDER BY COUNT(t.id) DESC
      `, [maxTicketsPerAgent]);

      for (const agent of overloadedAgents.rows) {
        // Get their oldest non-critical tickets
        const ticketsToReassign = await query(`
          SELECT id, category_id, priority
          FROM tickets
          WHERE assigned_agent_id = $1
            AND status = 'assigned'
            AND priority NOT IN ('critical', 'high')
          ORDER BY created_at ASC
          LIMIT $2
        `, [agent.agent_id, agent.active_tickets - maxTicketsPerAgent]);

        // Reassign to least loaded agents
        const Ticket = require('../models/Ticket');
        for (const ticket of ticketsToReassign.rows) {
          const newAgent = await this.findBestAgent(ticket.category_id, ticket.priority);
          if (newAgent && newAgent.id !== agent.agent_id) {
            await Ticket.assignToAgent(
              ticket.id,
              newAgent.id,
              null,
              'Reassigned for workload balancing'
            );
            console.log(`Rebalanced ticket ${ticket.id} from ${agent.full_name} to ${newAgent.full_name}`);
          }
        }
      }

      console.log('Workload rebalancing completed');
    } catch (error) {
      console.error('Error in workload rebalancing:', error);
    }
  }
}

module.exports = TicketRouter;
