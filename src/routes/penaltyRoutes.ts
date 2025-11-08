import { Router, Request, Response } from 'express';
import penaltyService from '../services/penaltyService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createCancellationRuleSchema = z.object({
  name: z.string().min(1),
  hoursBeforeStart: z.number().min(0),
  penaltyPercentage: z.number().min(0).max(100)
});

/**
 * POST /api/penalties/rules
 * Create cancellation rule
 */
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const data = createCancellationRuleSchema.parse(req.body);
    const rule = await penaltyService.createCancellationRule(data);
    res.status(201).json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/penalties/rules
 * Get all active cancellation rules
 */
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const rules = await penaltyService.getActiveCancellationRules();
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/penalties/rules/:id
 * Update cancellation rule
 */
router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const data = createCancellationRuleSchema.partial().parse(req.body);
    const rule = await penaltyService.updateCancellationRule(req.params.id, data);
    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/penalties/rules/:id
 * Deactivate cancellation rule
 */
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const rule = await penaltyService.deactivateCancellationRule(req.params.id);
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/penalties/:id
 * Get penalty by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const penalty = await penaltyService.getPenaltyById(req.params.id);
    if (!penalty) {
      return res.status(404).json({ error: 'Penalty not found' });
    }
    res.json(penalty);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/penalties/:id/pay
 * Mark penalty as paid
 */
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const penalty = await penaltyService.markPenaltyPaid(req.params.id);
    res.json(penalty);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/penalties/:id/waive
 * Waive (forgive) a penalty
 */
router.post('/:id/waive', async (req: Request, res: Response) => {
  try {
    const penalty = await penaltyService.waivePenalty(req.params.id);
    res.json(penalty);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/penalties/stats
 * Get penalty statistics
 */
router.get('/stats/all', async (req: Request, res: Response) => {
  try {
    const stats = await penaltyService.getPenaltyStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
