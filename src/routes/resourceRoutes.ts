import { Router, Request, Response } from 'express';
import resourceService from '../services/resourceService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createResourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['DOCTOR', 'BARBER', 'TECHNICIAN', 'CONSULTANT', 'OTHER']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  description: z.string().optional()
});

const createScheduleSchema = z.object({
  resourceId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
});

/**
 * POST /api/resources
 * Create a new resource
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createResourceSchema.parse(req.body);
    const resource = await resourceService.createResource(data);
    res.status(201).json(resource);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/resources
 * Get all active resources
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const resources = await resourceService.getActiveResources(type as any);
    res.json(resources);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/resources/:id
 * Get resource by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const resource = await resourceService.getResourceById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/resources/:id
 * Update resource
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = createResourceSchema.partial().parse(req.body);
    const resource = await resourceService.updateResource(req.params.id, data);
    res.json(resource);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/resources/:id
 * Deactivate resource
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const resource = await resourceService.deactivateResource(req.params.id);
    res.json(resource);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/resources/:id/schedules
 * Create schedule for resource
 */
router.post('/:id/schedules', async (req: Request, res: Response) => {
  try {
    const data = createScheduleSchema.parse({
      ...req.body,
      resourceId: req.params.id
    });
    const schedule = await resourceService.createSchedule(data);
    res.status(201).json(schedule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/resources/:id/schedules
 * Get schedules for resource
 */
router.get('/:id/schedules', async (req: Request, res: Response) => {
  try {
    const schedules = await resourceService.getResourceSchedules(req.params.id);
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
