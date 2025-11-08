const { query, transaction } = require('../database/connection');

class User {
  // Create a new user
  static async create(userData) {
    const query_text = `
      INSERT INTO users (username, email, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await query(query_text, [
      userData.username,
      userData.email,
      userData.full_name,
      userData.role,
      userData.is_active !== undefined ? userData.is_active : true,
    ]);

    return result.rows[0];
  }

  // Get user by ID
  static async getById(userId) {
    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  }

  // Get user by email
  static async getByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  // Get all users with optional role filter
  static async getAll(role = null) {
    let query_text = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query_text += ' AND role = $1';
      params.push(role);
    }

    query_text += ' ORDER BY created_at DESC';

    const result = await query(query_text, params);
    return result.rows;
  }

  // Get all agents
  static async getAllAgents() {
    return this.getAll('agent');
  }

  // Assign skills to an agent
  static async assignSkills(agentId, skills) {
    return transaction(async (client) => {
      // Verify agent exists and has agent role
      const agentCheck = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [agentId]
      );

      if (agentCheck.rows.length === 0) {
        throw new Error('Agent not found');
      }

      if (agentCheck.rows[0].role !== 'agent') {
        throw new Error('User is not an agent');
      }

      // Remove existing skills
      await client.query(
        'DELETE FROM agent_skill_mapping WHERE agent_id = $1',
        [agentId]
      );

      // Add new skills
      for (const skill of skills) {
        await client.query(
          `INSERT INTO agent_skill_mapping (agent_id, skill_id, proficiency_level)
           VALUES ($1, $2, $3)`,
          [agentId, skill.skill_id, skill.proficiency_level || 'intermediate']
        );
      }

      return this.getAgentWithSkills(agentId);
    });
  }

  // Get agent with their skills
  static async getAgentWithSkills(agentId) {
    const agentQuery = `
      SELECT
        u.*,
        json_agg(
          json_build_object(
            'skill_id', s.id,
            'skill_name', s.skill_name,
            'proficiency_level', asm.proficiency_level
          )
        ) FILTER (WHERE s.id IS NOT NULL) as skills
      FROM users u
      LEFT JOIN agent_skill_mapping asm ON u.id = asm.agent_id
      LEFT JOIN agent_skills s ON asm.skill_id = s.id
      WHERE u.id = $1 AND u.role = 'agent'
      GROUP BY u.id
    `;

    const result = await query(agentQuery, [agentId]);
    return result.rows[0];
  }

  // Find available agents by skill
  static async findAgentsBySkill(skillId, proficiencyLevel = null) {
    let query_text = `
      SELECT
        u.*,
        asm.proficiency_level,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as active_tickets
      FROM users u
      INNER JOIN agent_skill_mapping asm ON u.id = asm.agent_id
      LEFT JOIN tickets t ON u.id = t.assigned_agent_id
      WHERE asm.skill_id = $1
        AND u.is_active = true
    `;

    const params = [skillId];

    if (proficiencyLevel) {
      query_text += ' AND asm.proficiency_level = $2';
      params.push(proficiencyLevel);
    }

    query_text += `
      GROUP BY u.id, asm.proficiency_level
      ORDER BY active_tickets ASC, asm.proficiency_level DESC
    `;

    const result = await query(query_text, params);
    return result.rows;
  }

  // Update user
  static async update(userId, updateData) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    if (updateData.username !== undefined) {
      fields.push(`username = $${paramCount}`);
      params.push(updateData.username);
      paramCount++;
    }

    if (updateData.email !== undefined) {
      fields.push(`email = $${paramCount}`);
      params.push(updateData.email);
      paramCount++;
    }

    if (updateData.full_name !== undefined) {
      fields.push(`full_name = $${paramCount}`);
      params.push(updateData.full_name);
      paramCount++;
    }

    if (updateData.is_active !== undefined) {
      fields.push(`is_active = $${paramCount}`);
      params.push(updateData.is_active);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(userId);
    const query_text = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(query_text, params);
    return result.rows[0];
  }

  // Get agent statistics
  static async getAgentStatistics(agentId) {
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_tickets,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_tickets,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
        COUNT(*) FILTER (WHERE sla_breached = true) as sla_breached_tickets,
        AVG(
          CASE
            WHEN status IN ('resolved', 'closed')
            THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
          END
        ) as avg_resolution_time_minutes,
        COUNT(*) FILTER (
          WHERE status IN ('resolved', 'closed')
          AND resolved_at >= CURRENT_DATE
        ) as tickets_resolved_today,
        COUNT(*) FILTER (
          WHERE status IN ('resolved', 'closed')
          AND resolved_at >= date_trunc('week', CURRENT_DATE)
        ) as tickets_resolved_this_week
      FROM tickets
      WHERE assigned_agent_id = $1
    `;

    const result = await query(statsQuery, [agentId]);
    return result.rows[0];
  }
}

module.exports = User;
