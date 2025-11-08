const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketAssignment = sequelize.define('TicketAssignment', {
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
  assigned_to: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assignment_reason: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'ticket_assignments',
  updatedAt: false
});

module.exports = TicketAssignment;
