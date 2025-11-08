import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { AttachmentService } from '../services/attachmentService';
import { AuditService } from '../services/auditService';

const router = Router();

/**
 * Get ticket backlog counts
 */
router.get('/backlog', async (req: Request, res: Response) => {
  try {
    const backlog = await AnalyticsService.getBacklogCount();
    res.json(backlog);
  } catch (error) {
    console.error('Error getting backlog:', error);
    res.status(500).json({ error: 'Failed to get backlog data' });
  }
});

/**
 * Get SLA breach statistics
 */
router.get('/sla-breaches', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const breaches = await AnalyticsService.getSLABreaches(start, end);
    res.json(breaches);
  } catch (error) {
    console.error('Error getting SLA breaches:', error);
    res.status(500).json({ error: 'Failed to get SLA breach data' });
  }
});

/**
 * Get agent productivity metrics
 */
router.get('/agent-productivity', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const productivity = await AnalyticsService.getAgentProductivity(start, end);
    res.json(productivity);
  } catch (error) {
    console.error('Error getting agent productivity:', error);
    res.status(500).json({ error: 'Failed to get agent productivity data' });
  }
});

/**
 * Get resolution time distribution
 */
router.get('/resolution-time-distribution', async (req: Request, res: Response) => {
  try {
    const distribution = await AnalyticsService.getResolutionTimeDistribution();
    res.json(distribution);
  } catch (error) {
    console.error('Error getting resolution time distribution:', error);
    res.status(500).json({ error: 'Failed to get resolution time distribution' });
  }
});

/**
 * Get overall system metrics
 */
router.get('/system-metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await AnalyticsService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

/**
 * Get ticket trends
 */
router.get('/ticket-trends', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const trends = await AnalyticsService.getTicketTrends(parseInt(days as string));
    res.json(trends);
  } catch (error) {
    console.error('Error getting ticket trends:', error);
    res.status(500).json({ error: 'Failed to get ticket trends' });
  }
});

/**
 * Get skill-based metrics
 */
router.get('/skill-metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await AnalyticsService.getSkillMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting skill metrics:', error);
    res.status(500).json({ error: 'Failed to get skill metrics' });
  }
});

/**
 * Get attachment statistics
 */
router.get('/attachment-stats', async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.query;
    const stats = await AttachmentService.getAttachmentStats(ticketId as string | undefined);
    res.json(stats);
  } catch (error) {
    console.error('Error getting attachment stats:', error);
    res.status(500).json({ error: 'Failed to get attachment stats' });
  }
});

/**
 * Get recent audit logs
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { limit = '100' } = req.query;
    const logs = await AuditService.getRecentLogs(parseInt(limit as string));
    res.json(logs);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

export default router;
