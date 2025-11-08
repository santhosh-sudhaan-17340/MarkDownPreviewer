const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Workflow = sequelize.define('Workflow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  trigger_type: {
    type: DataTypes.ENUM('status_change', 'priority_change', 'time_based', 'assignment', 'escalation', 'sla_breach'),
    allowNull: false
  },
  trigger_conditions: {
    type: DataTypes.JSONB
  },
  actions: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  execution_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'workflows'
});

module.exports = Workflow;
