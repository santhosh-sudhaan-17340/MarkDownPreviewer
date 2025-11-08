#!/usr/bin/env node

/**
 * Database Initialization Script
 * Creates tables and initial data
 */

const sequelize = require('../config/database');
const { User, Skill, SlaPolicy } = require('../models');
require('dotenv').config();

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    console.log('Creating tables...');
    await sequelize.sync({ force: true }); // This will drop existing tables
    console.log('Tables created successfully.');

    console.log('Creating default SLA policies...');
    await SlaPolicy.bulkCreate([
      {
        name: 'Critical SLA',
        priority: 'critical',
        response_time_hours: 1,
        resolution_time_hours: 4,
        escalation_time_hours: 2,
        is_active: true
      },
      {
        name: 'High Priority SLA',
        priority: 'high',
        response_time_hours: 4,
        resolution_time_hours: 24,
        escalation_time_hours: 8,
        is_active: true
      },
      {
        name: 'Medium Priority SLA',
        priority: 'medium',
        response_time_hours: 8,
        resolution_time_hours: 72,
        escalation_time_hours: 24,
        is_active: true
      },
      {
        name: 'Low Priority SLA',
        priority: 'low',
        response_time_hours: 24,
        resolution_time_hours: 168,
        escalation_time_hours: 48,
        is_active: true
      }
    ]);
    console.log('SLA policies created.');

    console.log('Creating default skills...');
    await Skill.bulkCreate([
      { name: 'Technical Support', description: 'General technical support and troubleshooting' },
      { name: 'Billing', description: 'Billing and payment related issues' },
      { name: 'Account Management', description: 'Account setup, changes, and management' },
      { name: 'Product Support', description: 'Product-specific questions and issues' },
      { name: 'Network Issues', description: 'Network connectivity and configuration' },
      { name: 'Security', description: 'Security-related concerns and incidents' }
    ]);
    console.log('Skills created.');

    console.log('Creating admin user...');
    await User.create({
      email: 'admin@example.com',
      password_hash: 'admin123',
      full_name: 'System Administrator',
      role: 'admin',
      is_active: true
    });
    console.log('Admin user created (email: admin@example.com, password: admin123)');

    console.log('\nDatabase initialization completed successfully!');
    console.log('You can now start the server with: npm start');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

initDatabase();
