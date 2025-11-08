const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketEscalation = sequelize.define('TicketEscalation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticket_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tickets',
      key: 'id'
    }
  },
  escalated_from: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  escalated_to: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  escalation_reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  escalation_level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  is_auto_escalated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'ticket_escalations',
  updatedAt: false
});

module.exports = TicketEscalation;
