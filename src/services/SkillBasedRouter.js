const db = require('../config/database');

class SkillBasedRouter {
    /**
     * Find best agent for a ticket based on skills, workload, and SLA
     */
    async findBestAgent(ticketId) {
        const ticket = await this.getTicketWithCategory(ticketId);

        if (!ticket) {
            throw new Error('Ticket not found');
        }

        // Get required skill for this category
        const requiredSkillId = ticket.required_skill_id;

        if (!requiredSkillId) {
            // No specific skill required, use general availability
            return this.findAvailableAgent(ticket.priority);
        }

        // Find agents with the required skill
        const agents = await this.findAgentsWithSkill(requiredSkillId, ticket.priority);

        if (agents.length === 0) {
            console.log(`No agents found with required skill ${requiredSkillId}, falling back to general availability`);
            return this.findAvailableAgent(ticket.priority);
        }

        // Score and rank agents
        const scoredAgents = agents.map(agent => ({
            ...agent,
            score: this.calculateAgentScore(agent, ticket)
        }));

        // Sort by score (higher is better)
        scoredAgents.sort((a, b) => b.score - a.score);

        return scoredAgents[0];
    }

    /**
     * Get ticket with category information
     */
    async getTicketWithCategory(ticketId) {
        const result = await db.query(`
            SELECT
                t.*,
                c.required_skill_id,
                c.name as category_name
            FROM tickets t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id = $1;
        `, [ticketId]);

        return result.rows[0];
    }

    /**
     * Find agents with specific skill
     */
    async findAgentsWithSkill(skillId, priority = 'medium') {
        const result = await db.query(`
            SELECT
                a.*,
                ask.proficiency_level,
                CAST(a.current_ticket_count AS FLOAT) / CAST(a.max_concurrent_tickets AS FLOAT) as workload_ratio,
                COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as active_ticket_count,
                AVG(CASE
                    WHEN t.resolved_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600
                END) as avg_resolution_hours,
                COUNT(CASE WHEN t.sla_resolution_breached THEN 1 END) as recent_sla_breaches
            FROM agents a
            JOIN agent_skills ask ON a.id = ask.agent_id
            LEFT JOIN tickets t ON a.id = t.assigned_agent_id
                AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
            WHERE ask.skill_id = $1
                AND a.is_active = true
                AND a.current_ticket_count < a.max_concurrent_tickets
            GROUP BY a.id, ask.proficiency_level
            ORDER BY ask.proficiency_level DESC, workload_ratio ASC;
        `, [skillId]);

        return result.rows;
    }

    /**
     * Find any available agent (no specific skill required)
     */
    async findAvailableAgent(priority = 'medium') {
        const result = await db.query(`
            SELECT
                a.*,
                CAST(a.current_ticket_count AS FLOAT) / CAST(a.max_concurrent_tickets AS FLOAT) as workload_ratio,
                COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as active_ticket_count,
                AVG(CASE
                    WHEN t.resolved_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600
                END) as avg_resolution_hours,
                COUNT(CASE WHEN t.sla_resolution_breached THEN 1 END) as recent_sla_breaches
            FROM agents a
            LEFT JOIN tickets t ON a.id = t.assigned_agent_id
                AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
            WHERE a.is_active = true
                AND a.current_ticket_count < a.max_concurrent_tickets
            GROUP BY a.id
            ORDER BY workload_ratio ASC, recent_sla_breaches ASC;
        `, []);

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    /**
     * Calculate agent score for routing
     * Higher score = better match
     */
    calculateAgentScore(agent, ticket) {
        let score = 100;

        // Skill proficiency (0-25 points)
        if (agent.proficiency_level) {
            score += agent.proficiency_level * 5;
        }

        // Workload (0-30 points) - less workload = higher score
        const workloadScore = 30 * (1 - (agent.workload_ratio || 0));
        score += workloadScore;

        // Recent performance (0-25 points)
        const recentBreaches = agent.recent_sla_breaches || 0;
        const performanceScore = Math.max(0, 25 - (recentBreaches * 5));
        score += performanceScore;

        // Average resolution time (0-20 points) - faster = better
        if (agent.avg_resolution_hours) {
            const resolutionScore = Math.max(0, 20 - (agent.avg_resolution_hours / 10));
            score += resolutionScore;
        } else {
            score += 10; // Default score for new agents
        }

        return score;
    }

    /**
     * Auto-assign ticket to best agent
     */
    async autoAssign(ticketId) {
        const bestAgent = await this.findBestAgent(ticketId);

        if (!bestAgent) {
            console.log(`No available agent found for ticket ${ticketId}`);
            return null;
        }

        // Assign the ticket
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const result = await client.query(`
                UPDATE tickets
                SET assigned_agent_id = $1,
                    status = 'open',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *;
            `, [bestAgent.id, ticketId]);

            if (result.rows.length === 0) {
                throw new Error('Ticket not found');
            }

            // Update agent's current ticket count
            await client.query(`
                UPDATE agents
                SET current_ticket_count = current_ticket_count + 1
                WHERE id = $1;
            `, [bestAgent.id]);

            await client.query('COMMIT');

            return {
                ticket: result.rows[0],
                agent: bestAgent
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Re-route ticket to different agent (for escalation or load balancing)
     */
    async reRoute(ticketId, excludeAgentIds = []) {
        const ticket = await this.getTicketWithCategory(ticketId);

        if (!ticket) {
            throw new Error('Ticket not found');
        }

        const requiredSkillId = ticket.required_skill_id;
        let agents;

        if (requiredSkillId) {
            agents = await this.findAgentsWithSkill(requiredSkillId, ticket.priority);
        } else {
            const result = await db.query(`
                SELECT
                    a.*,
                    CAST(a.current_ticket_count AS FLOAT) / CAST(a.max_concurrent_tickets AS FLOAT) as workload_ratio
                FROM agents a
                WHERE a.is_active = true
                    AND a.current_ticket_count < a.max_concurrent_tickets
                ORDER BY workload_ratio ASC;
            `);
            agents = result.rows;
        }

        // Filter out excluded agents
        agents = agents.filter(agent => !excludeAgentIds.includes(agent.id));

        if (agents.length === 0) {
            return null;
        }

        // Score and rank agents
        const scoredAgents = agents.map(agent => ({
            ...agent,
            score: this.calculateAgentScore(agent, ticket)
        }));

        scoredAgents.sort((a, b) => b.score - a.score);

        return scoredAgents[0];
    }

    /**
     * Get routing suggestions for manual assignment
     */
    async getRoutingSuggestions(ticketId, limit = 5) {
        const ticket = await this.getTicketWithCategory(ticketId);

        if (!ticket) {
            throw new Error('Ticket not found');
        }

        const requiredSkillId = ticket.required_skill_id;
        let agents;

        if (requiredSkillId) {
            agents = await this.findAgentsWithSkill(requiredSkillId, ticket.priority);
        } else {
            const result = await db.query(`
                SELECT
                    a.*,
                    CAST(a.current_ticket_count AS FLOAT) / CAST(a.max_concurrent_tickets AS FLOAT) as workload_ratio
                FROM agents a
                WHERE a.is_active = true
                ORDER BY workload_ratio ASC;
            `);
            agents = result.rows;
        }

        // Score and rank agents
        const scoredAgents = agents.map(agent => ({
            ...agent,
            score: this.calculateAgentScore(agent, ticket),
            recommendation_reason: this.getRecommendationReason(agent, ticket)
        }));

        scoredAgents.sort((a, b) => b.score - a.score);

        return scoredAgents.slice(0, limit);
    }

    /**
     * Get human-readable recommendation reason
     */
    getRecommendationReason(agent, ticket) {
        const reasons = [];

        if (agent.proficiency_level && agent.proficiency_level >= 4) {
            reasons.push(`High skill proficiency (Level ${agent.proficiency_level})`);
        }

        if (agent.workload_ratio < 0.5) {
            reasons.push('Low current workload');
        }

        if (agent.recent_sla_breaches === 0) {
            reasons.push('No recent SLA breaches');
        }

        if (agent.avg_resolution_hours && agent.avg_resolution_hours < 4) {
            reasons.push('Fast average resolution time');
        }

        return reasons.length > 0 ? reasons.join(', ') : 'Available agent';
    }
}

module.exports = new SkillBasedRouter();
