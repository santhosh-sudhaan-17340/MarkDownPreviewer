const { User, UserSkill, Skill, Ticket } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

class RoutingService {

  // Find best agent based on skill and workload
  static async findBestAgent(skillId, priority = 'medium') {
    if (!skillId) {
      return await this.findLeastBusyAgent();
    }

    // Find agents with the required skill
    const agentsWithSkill = await User.findAll({
      where: {
        role: 'agent',
        is_active: true
      },
      include: [{
        model: Skill,
        where: { id: skillId },
        through: {
          attributes: ['proficiency_level']
        }
      }],
      attributes: ['id', 'full_name', 'email']
    });

    if (agentsWithSkill.length === 0) {
      // Fallback to any available agent
      return await this.findLeastBusyAgent();
    }

    // Get workload for each agent
    const agentWorkloads = await Promise.all(
      agentsWithSkill.map(async (agent) => {
        const activeTickets = await Ticket.count({
          where: {
            assigned_agent_id: agent.id,
            status: {
              [Op.notIn]: ['closed', 'resolved']
            }
          }
        });

        const criticalTickets = await Ticket.count({
          where: {
            assigned_agent_id: agent.id,
            priority: 'critical',
            status: {
              [Op.notIn]: ['closed', 'resolved']
            }
          }
        });

        const proficiency = agent.Skills[0]?.UserSkill?.proficiency_level || 1;

        return {
          agent,
          activeTickets,
          criticalTickets,
          proficiency,
          score: this.calculateAgentScore(activeTickets, criticalTickets, proficiency)
        };
      })
    );

    // Sort by score (lower is better) and proficiency (higher is better)
    agentWorkloads.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return b.proficiency - a.proficiency;
    });

    return agentWorkloads[0]?.agent || null;
  }

  // Calculate agent score for routing (lower is better)
  static calculateAgentScore(activeTickets, criticalTickets, proficiency) {
    // Weight: active tickets + (critical tickets * 2) - (proficiency * 5)
    return activeTickets + (criticalTickets * 2) - (proficiency * 5);
  }

  // Find least busy agent (fallback)
  static async findLeastBusyAgent() {
    const agents = await User.findAll({
      where: {
        role: 'agent',
        is_active: true
      }
    });

    if (agents.length === 0) {
      return null;
    }

    const agentWorkloads = await Promise.all(
      agents.map(async (agent) => {
        const activeTickets = await Ticket.count({
          where: {
            assigned_agent_id: agent.id,
            status: {
              [Op.notIn]: ['closed', 'resolved']
            }
          }
        });

        return { agent, activeTickets };
      })
    );

    agentWorkloads.sort((a, b) => a.activeTickets - b.activeTickets);
    return agentWorkloads[0].agent;
  }

  // Auto-assign ticket based on skill and workload
  static async autoAssignTicket(ticketId) {
    const ticket = await Ticket.findByPk(ticketId, {
      include: [{ model: Skill }]
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const agent = await this.findBestAgent(ticket.skill_id, ticket.priority);

    if (!agent) {
      throw new Error('No available agents found');
    }

    await ticket.update({
      assigned_agent_id: agent.id,
      status: 'assigned'
    });

    return agent;
  }

  // Get routing statistics
  static async getRoutingStatistics() {
    const agents = await User.findAll({
      where: {
        role: 'agent',
        is_active: true
      },
      include: [{
        model: Skill,
        through: {
          attributes: ['proficiency_level']
        }
      }]
    });

    const statistics = await Promise.all(
      agents.map(async (agent) => {
        const activeTickets = await Ticket.count({
          where: {
            assigned_agent_id: agent.id,
            status: {
              [Op.notIn]: ['closed', 'resolved']
            }
          }
        });

        const totalTickets = await Ticket.count({
          where: {
            assigned_agent_id: agent.id
          }
        });

        const resolvedTickets = await Ticket.count({
          where: {
            assigned_agent_id: agent.id,
            status: {
              [Op.in]: ['resolved', 'closed']
            }
          }
        });

        return {
          agent: {
            id: agent.id,
            name: agent.full_name,
            email: agent.email
          },
          skills: agent.Skills.map(skill => ({
            name: skill.name,
            proficiency: skill.UserSkill.proficiency_level
          })),
          activeTickets,
          totalTickets,
          resolvedTickets,
          utilizationRate: totalTickets > 0 ? (activeTickets / totalTickets * 100).toFixed(2) : 0
        };
      })
    );

    return statistics;
  }
}

module.exports = RoutingService;
