const Reports = require('../models/Reports');
const SLAMonitor = require('../services/slaMonitor');

class ReportsController {
  // Get backlog counts
  static async getBacklogCounts(req, res) {
    try {
      const backlog = await Reports.getBacklogCounts();
      res.json({
        success: true,
        data: backlog,
      });
    } catch (error) {
      console.error('Error fetching backlog counts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch backlog counts',
        error: error.message,
      });
    }
  }

  // Get backlog summary
  static async getBacklogSummary(req, res) {
    try {
      const summary = await Reports.getBacklogSummary();
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching backlog summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch backlog summary',
        error: error.message,
      });
    }
  }

  // Get SLA breaches
  static async getSLABreaches(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const breaches = await Reports.getSLABreaches(start_date, end_date);

      res.json({
        success: true,
        count: breaches.length,
        data: breaches,
      });
    } catch (error) {
      console.error('Error fetching SLA breaches:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SLA breaches',
        error: error.message,
      });
    }
  }

  // Get SLA breach statistics
  static async getSLABreachStats(req, res) {
    try {
      const { period } = req.query;
      const stats = await Reports.getSLABreachStatistics(period || 'month');

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching SLA breach statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SLA breach statistics',
        error: error.message,
      });
    }
  }

  // Get SLA metrics
  static async getSLAMetrics(req, res) {
    try {
      const days = req.query.days ? parseInt(req.query.days) : 30;
      const metrics = await SLAMonitor.getSLAMetrics(days);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Error fetching SLA metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SLA metrics',
        error: error.message,
      });
    }
  }

  // Get upcoming SLA deadlines
  static async getUpcomingSLADeadlines(req, res) {
    try {
      const hoursAhead = req.query.hours ? parseInt(req.query.hours) : 4;
      const deadlines = await SLAMonitor.getUpcomingSLADeadlines(hoursAhead);

      res.json({
        success: true,
        count: deadlines.length,
        data: deadlines,
      });
    } catch (error) {
      console.error('Error fetching upcoming SLA deadlines:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upcoming SLA deadlines',
        error: error.message,
      });
    }
  }

  // Get agent productivity
  static async getAgentProductivity(req, res) {
    try {
      const { agent_id, start_date, end_date } = req.query;
      const agentIdInt = agent_id ? parseInt(agent_id) : null;

      const productivity = await Reports.getAgentProductivity(
        agentIdInt,
        start_date,
        end_date
      );

      res.json({
        success: true,
        count: productivity.length,
        data: productivity,
      });
    } catch (error) {
      console.error('Error fetching agent productivity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent productivity',
        error: error.message,
      });
    }
  }

  // Get agent workload
  static async getAgentWorkload(req, res) {
    try {
      const workload = await Reports.getAgentWorkload();

      res.json({
        success: true,
        data: workload,
      });
    } catch (error) {
      console.error('Error fetching agent workload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch agent workload',
        error: error.message,
      });
    }
  }

  // Get tickets by category
  static async getTicketsByCategory(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const categories = await Reports.getTicketsByCategory(start_date, end_date);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error('Error fetching tickets by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets by category',
        error: error.message,
      });
    }
  }

  // Get trending issues
  static async getTrendingIssues(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      const trending = await Reports.getTrendingIssues(limit);

      res.json({
        success: true,
        data: trending,
      });
    } catch (error) {
      console.error('Error fetching trending issues:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trending issues',
        error: error.message,
      });
    }
  }

  // Get daily ticket volume
  static async getDailyTicketVolume(req, res) {
    try {
      const days = req.query.days ? parseInt(req.query.days) : 30;
      const volume = await Reports.getDailyTicketVolume(days);

      res.json({
        success: true,
        data: volume,
      });
    } catch (error) {
      console.error('Error fetching daily ticket volume:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch daily ticket volume',
        error: error.message,
      });
    }
  }

  // Get resolution time distribution
  static async getResolutionTimeDistribution(req, res) {
    try {
      const distribution = await Reports.getResolutionTimeDistribution();

      res.json({
        success: true,
        data: distribution,
      });
    } catch (error) {
      console.error('Error fetching resolution time distribution:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resolution time distribution',
        error: error.message,
      });
    }
  }
}

module.exports = ReportsController;
