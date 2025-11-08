const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserSkill = sequelize.define('UserSkill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  skill_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'skills',
      key: 'id'
    }
  },
  proficiency_level: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  tableName: 'user_skills',
  updatedAt: false
});

module.exports = UserSkill;
