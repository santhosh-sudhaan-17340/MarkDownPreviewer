import cron from 'node-cron';
import { SLAService } from '../services/slaService';
import { RoutingService } from '../services/routingService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * SLA Monitoring Job
 * Runs every 5 minutes to check and update SLA status for all active tickets
 */
export function startSLAMonitoring() {
  console.log('Starting SLA monitoring job...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running SLA monitoring...`);

    try {
      await SLAService.monitorAllTickets();
      console.log('SLA monitoring completed successfully');
    } catch (error) {
      console.error('Error in SLA monitoring:', error);
    }
  });

  // Run workload balancing every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running workload balancing...`);

    try {
      await RoutingService.balanceWorkload();
      console.log('Workload balancing completed successfully');
    } catch (error) {
      console.error('Error in workload balancing:', error);
    }
  });

  console.log('SLA monitoring job scheduled successfully');
  console.log('- SLA checks: Every 5 minutes');
  console.log('- Workload balancing: Every 15 minutes');
}

// Run immediately if executed directly
if (require.main === module) {
  console.log('Running SLA monitor standalone...');

  // Import database connection
  require('../config/database');

  startSLAMonitoring();

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('Shutting down SLA monitor...');
    process.exit(0);
  });
}
