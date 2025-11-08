#!/usr/bin/env node

/**
 * SLA Monitor - Background Service
 * Runs periodically to check for SLA breaches and auto-escalations
 */

const cron = require('node-cron');
const SlaService = require('./slaService');
const sequelize = require('../config/database');
require('dotenv').config();

console.log('SLA Monitor Service Starting...');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running SLA checks...`);

  try {
    // Check for SLA breaches
    const breachedCount = await SlaService.checkSlaBreaches();
    if (breachedCount > 0) {
      console.log(`Marked ${breachedCount} ticket(s) as SLA breached`);
    }

    // Check for auto-escalations
    const escalatedCount = await SlaService.checkAutoEscalations();
    if (escalatedCount > 0) {
      console.log(`Auto-escalated ${escalatedCount} ticket(s)`);
    }

    console.log(`SLA check completed. Breaches: ${breachedCount}, Escalations: ${escalatedCount}`);
  } catch (error) {
    console.error('Error during SLA check:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down SLA Monitor...');
  await sequelize.close();
  process.exit(0);
});

console.log('SLA Monitor is running. Press Ctrl+C to stop.');
