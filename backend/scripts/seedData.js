#!/usr/bin/env node

/**
 * Seed Data Script
 * Populates database with sample data for testing
 */

const sequelize = require('../config/database');
const { User, Skill, UserSkill, Ticket, SlaPolicy } = require('../models');
const SlaService = require('../services/slaService');
require('dotenv').config();

async function seedData() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();

    console.log('Creating sample users...');

    // Create customers
    const customers = await User.bulkCreate([
      {
        email: 'john.doe@example.com',
        password_hash: 'password123',
        full_name: 'John Doe',
        role: 'customer'
      },
      {
        email: 'jane.smith@example.com',
        password_hash: 'password123',
        full_name: 'Jane Smith',
        role: 'customer'
      },
      {
        email: 'bob.wilson@example.com',
        password_hash: 'password123',
        full_name: 'Bob Wilson',
        role: 'customer'
      }
    ]);
    console.log(`Created ${customers.length} customers`);

    // Create agents
    const agents = await User.bulkCreate([
      {
        email: 'agent1@example.com',
        password_hash: 'password123',
        full_name: 'Alice Johnson',
        role: 'agent'
      },
      {
        email: 'agent2@example.com',
        password_hash: 'password123',
        full_name: 'Tom Brown',
        role: 'agent'
      },
      {
        email: 'agent3@example.com',
        password_hash: 'password123',
        full_name: 'Sarah Davis',
        role: 'agent'
      }
    ]);
    console.log(`Created ${agents.length} agents`);

    // Get skills
    const skills = await Skill.findAll();

    // Assign skills to agents
    console.log('Assigning skills to agents...');
    await UserSkill.bulkCreate([
      { user_id: agents[0].id, skill_id: skills[0].id, proficiency_level: 5 }, // Alice - Technical Support
      { user_id: agents[0].id, skill_id: skills[3].id, proficiency_level: 4 }, // Alice - Product Support
      { user_id: agents[1].id, skill_id: skills[1].id, proficiency_level: 5 }, // Tom - Billing
      { user_id: agents[1].id, skill_id: skills[2].id, proficiency_level: 4 }, // Tom - Account Management
      { user_id: agents[2].id, skill_id: skills[4].id, proficiency_level: 5 }, // Sarah - Network Issues
      { user_id: agents[2].id, skill_id: skills[5].id, proficiency_level: 5 }  // Sarah - Security
    ]);
    console.log('Skills assigned');

    // Create sample tickets
    console.log('Creating sample tickets...');
    const ticketData = [
      {
        subject: 'Cannot login to my account',
        description: 'I have been trying to login for the past hour but keep getting an error message.',
        priority: 'high',
        category: 'Account Access',
        customer_id: customers[0].id,
        skill_id: skills[2].id,
        status: 'open'
      },
      {
        subject: 'Billing discrepancy on last invoice',
        description: 'My last invoice shows charges that I do not recognize. Please review.',
        priority: 'medium',
        category: 'Billing',
        customer_id: customers[1].id,
        skill_id: skills[1].id,
        status: 'assigned',
        assigned_agent_id: agents[1].id
      },
      {
        subject: 'Software crash on startup',
        description: 'The application crashes immediately after I click the icon. Error code: 0x8000FFFF',
        priority: 'critical',
        category: 'Technical Issue',
        customer_id: customers[2].id,
        skill_id: skills[0].id,
        status: 'in_progress',
        assigned_agent_id: agents[0].id,
        first_response_at: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        subject: 'Request for feature enhancement',
        description: 'It would be great if the app had dark mode support.',
        priority: 'low',
        category: 'Feature Request',
        customer_id: customers[0].id,
        skill_id: skills[3].id,
        status: 'pending',
        assigned_agent_id: agents[0].id
      },
      {
        subject: 'Network connectivity issues',
        description: 'Experiencing intermittent disconnections every few minutes.',
        priority: 'high',
        category: 'Network',
        customer_id: customers[1].id,
        skill_id: skills[4].id,
        status: 'assigned',
        assigned_agent_id: agents[2].id
      },
      {
        subject: 'Security concern - suspicious activity',
        description: 'I noticed login attempts from an unknown location. Please investigate.',
        priority: 'critical',
        category: 'Security',
        customer_id: customers[2].id,
        skill_id: skills[5].id,
        status: 'escalated',
        assigned_agent_id: agents[2].id,
        escalated_at: new Date()
      }
    ];

    for (const data of ticketData) {
      const ticket = await Ticket.create(data);
      await SlaService.applySlaPolicy(ticket);
    }
    console.log(`Created ${ticketData.length} sample tickets`);

    console.log('\nSample data created successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Agent 1: agent1@example.com / password123');
    console.log('Agent 2: agent2@example.com / password123');
    console.log('Agent 3: agent3@example.com / password123');
    console.log('Customer 1: john.doe@example.com / password123');
    console.log('Customer 2: jane.smith@example.com / password123');
    console.log('Customer 3: bob.wilson@example.com / password123');

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedData();
