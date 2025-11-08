const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimeEntry = sequelize.define('TimeEntry', {
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
  description: {
    type: DataTypes.TEXT
  },
  hours: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  billable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  started_at: {
    type: DataTypes.DATE
  },
  ended_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'time_entries',
  updatedAt: false
});

module.exports = TimeEntry;
