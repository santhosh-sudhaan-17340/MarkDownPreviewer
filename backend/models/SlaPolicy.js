const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SlaPolicy = sequelize.define('SlaPolicy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false
  },
  response_time_hours: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  resolution_time_hours: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  escalation_time_hours: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'sla_policies'
});

module.exports = SlaPolicy;
