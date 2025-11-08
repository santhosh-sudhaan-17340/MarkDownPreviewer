const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticket_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  subject: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('open', 'assigned', 'in_progress', 'pending', 'resolved', 'closed', 'escalated'),
    allowNull: false,
    defaultValue: 'open'
  },
  category: {
    type: DataTypes.STRING(100)
  },
  customer_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_agent_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  skill_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'skills',
      key: 'id'
    }
  },
  sla_policy_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'sla_policies',
      key: 'id'
    }
  },
  first_response_at: {
    type: DataTypes.DATE
  },
  resolved_at: {
    type: DataTypes.DATE
  },
  closed_at: {
    type: DataTypes.DATE
  },
  due_date: {
    type: DataTypes.DATE
  },
  escalated_at: {
    type: DataTypes.DATE
  },
  is_sla_breached: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sla_breach_reason: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'tickets',
  hooks: {
    beforeCreate: async (ticket) => {
      // Generate ticket number
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      ticket.ticket_number = `TKT-${timestamp}-${random}`;
    }
  }
});

module.exports = Ticket;
