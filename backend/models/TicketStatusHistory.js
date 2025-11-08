const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketStatusHistory = sequelize.define('TicketStatusHistory', {
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
  from_status: {
    type: DataTypes.STRING(50)
  },
  to_status: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  changed_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  comment: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'ticket_status_history',
  updatedAt: false
});

module.exports = TicketStatusHistory;
