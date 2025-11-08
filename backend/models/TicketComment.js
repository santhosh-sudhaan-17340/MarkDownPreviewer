const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TicketComment = sequelize.define('TicketComment', {
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
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_internal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'ticket_comments'
});

module.exports = TicketComment;
