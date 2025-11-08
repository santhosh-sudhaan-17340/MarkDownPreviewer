const { Ticket, User, Skill } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

class SearchService {

  // Advanced full-text search
  static async fullTextSearch(query, options = {}) {
    const {
      status,
      priority,
      dateFrom,
      dateTo,
      assignedTo,
      customerId,
      limit = 20,
      offset = 0
    } = options;

    const where = {};

    // Full-text search on subject and description
    if (query && query.trim()) {
      where[Op.or] = [
        sequelize.where(
          sequelize.fn(
            'to_tsvector',
            'english',
            sequelize.fn('concat', sequelize.col('subject'), ' ', sequelize.col('description'))
          ),
          '@@',
          sequelize.fn('plainto_tsquery', 'english', query)
        )
      ];
    }

    // Apply filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assigned_agent_id = assignedTo;
    if (customerId) where.customer_id = customerId;

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = dateFrom;
      if (dateTo) where.created_at[Op.lte] = dateTo;
    }

    const { rows: tickets, count } = await Ticket.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'assignedAgent', attributes: ['id', 'full_name', 'email'] },
        { model: Skill, attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return {
      tickets,
      total: count,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Search tickets by multiple criteria
  static async advancedSearch(criteria) {
    const where = {};

    if (criteria.ticket_number) {
      where.ticket_number = {
        [Op.iLike]: `%${criteria.ticket_number}%`
      };
    }

    if (criteria.subject) {
      where.subject = {
        [Op.iLike]: `%${criteria.subject}%`
      };
    }

    if (criteria.description) {
      where.description = {
        [Op.iLike]: `%${criteria.description}%`
      };
    }

    if (criteria.status) {
      where.status = Array.isArray(criteria.status) ? { [Op.in]: criteria.status } : criteria.status;
    }

    if (criteria.priority) {
      where.priority = Array.isArray(criteria.priority) ? { [Op.in]: criteria.priority } : criteria.priority;
    }

    if (criteria.is_sla_breached !== undefined) {
      where.is_sla_breached = criteria.is_sla_breached;
    }

    if (criteria.created_from || criteria.created_to) {
      where.created_at = {};
      if (criteria.created_from) where.created_at[Op.gte] = criteria.created_from;
      if (criteria.created_to) where.created_at[Op.lte] = criteria.created_to;
    }

    if (criteria.due_from || criteria.due_to) {
      where.due_date = {};
      if (criteria.due_from) where.due_date[Op.gte] = criteria.due_from;
      if (criteria.due_to) where.due_date[Op.lte] = criteria.due_to;
    }

    return await Ticket.findAll({
      where,
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'assignedAgent' },
        { model: Skill }
      ],
      limit: criteria.limit || 50,
      offset: criteria.offset || 0,
      order: [[criteria.sortBy || 'created_at', criteria.sortOrder || 'DESC']]
    });
  }

  // Search with relevance ranking
  static async searchWithRelevance(query, limit = 20) {
    if (!query || !query.trim()) {
      return [];
    }

    const results = await sequelize.query(
      `
      SELECT
        t.*,
        ts_rank(
          to_tsvector('english', t.subject || ' ' || t.description),
          plainto_tsquery('english', :query)
        ) as relevance
      FROM tickets t
      WHERE
        to_tsvector('english', t.subject || ' ' || t.description) @@ plainto_tsquery('english', :query)
      ORDER BY relevance DESC, t.created_at DESC
      LIMIT :limit
      `,
      {
        replacements: { query, limit },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Fetch full ticket objects with associations
    const ticketIds = results.map(r => r.id);
    const tickets = await Ticket.findAll({
      where: { id: { [Op.in]: ticketIds } },
      include: [
        { model: User, as: 'customer' },
        { model: User, as: 'assignedAgent' }
      ]
    });

    // Maintain relevance order
    return ticketIds.map(id => tickets.find(t => t.id === id)).filter(Boolean);
  }

  // Auto-suggest based on partial input
  static async autoSuggest(partialQuery, field = 'subject', limit = 10) {
    const where = {};
    where[field] = {
      [Op.iLike]: `%${partialQuery}%`
    };

    const tickets = await Ticket.findAll({
      where,
      attributes: ['id', field, 'ticket_number'],
      limit,
      order: [['created_at', 'DESC']]
    });

    return tickets.map(t => ({
      id: t.id,
      ticket_number: t.ticket_number,
      text: t[field]
    }));
  }
}

module.exports = SearchService;
