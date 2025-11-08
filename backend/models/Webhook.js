const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Webhook = sequelize.define('Webhook', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  event_types: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: false
  },
  secret_key: {
    type: DataTypes.STRING(255)
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  timeout_ms: {
    type: DataTypes.INTEGER,
    defaultValue: 5000
  }
}, {
  tableName: 'webhooks'
});

module.exports = Webhook;
