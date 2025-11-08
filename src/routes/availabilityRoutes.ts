import { Router, Request, Response } from 'express';
import availabilityService from '../services/availabilityService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const searchAvailabilitySchema = z.object({
  resourceId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  durationMinutes: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

/**
 * POST /api/availability/search
 * Find nearest available slots
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const data = searchAvailabilitySchema.parse(req.body);

    const slots = await availabilityService.findNearestAvailableSlots({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined
    });

    res.json({
      count: slots.length,
      slots
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/availability/resource/:resourceId
 * Get availability for a specific resource
 */
router.get('/resource/:resourceId', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date();

    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const durationMinutes = req.query.durationMinutes
      ? Number(req.query.durationMinutes)
      : 30;

    const slots = await availabilityService.getResourceAvailability(
      req.params.resourceId,
      startDate,
      endDate,
      durationMinutes
    );

    res.json({
      resourceId: req.params.resourceId,
      startDate,
      endDate,
      durationMinutes,
      count: slots.length,
      slots
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/availability/check
 * Check if a specific slot is available
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { resourceId, startTime, endTime } = req.body;

    if (!resourceId || !startTime || !endTime) {
      return res.status(400).json({
        error: 'resourceId, startTime, and endTime are required'
      });
    }

    const isAvailable = await availabilityService.isSlotAvailable(
      resourceId,
      new Date(startTime),
      new Date(endTime)
    );

    res.json({ isAvailable });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/availability/resource/:resourceId/utilization
 * Get resource utilization statistics
 */
router.get('/resource/:resourceId/utilization', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date();

    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const stats = await availabilityService.getResourceUtilization(
      req.params.resourceId,
      startDate,
      endDate
    );

    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
