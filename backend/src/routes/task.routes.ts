import { Router } from 'express';
import Joi from 'joi';
import { TaskService } from '../services/task.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, validateQuery } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const taskCompletionSchema = Joi.object({
  taskId: Joi.string().uuid().required(),
  completionTimeSeconds: Joi.number().min(0).optional(),
  accuracyPercentage: Joi.number().min(0).max(100).optional(),
});

const createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).optional(),
  category: Joi.string().min(2).max(50).required(),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').required(),
  basePoints: Joi.number().min(1).required(),
  bonusPoints: Joi.number().min(0).optional(),
  timeLimitMinutes: Joi.number().min(1).optional(),
});

const taskFilterSchema = Joi.object({
  category: Joi.string().optional(),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
  isActive: Joi.boolean().optional(),
});

// Routes
router.get(
  '/',
  validateQuery(taskFilterSchema),
  asyncHandler(async (req, res) => {
    const tasks = await TaskService.getAllTasks(req.query as any);
    res.json({
      success: true,
      data: { tasks, count: tasks.length },
    });
  })
);

router.get(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const task = await TaskService.getTaskById(req.params.taskId);
    res.json({
      success: true,
      data: { task },
    });
  })
);

router.get(
  '/user/progress',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const progress = await TaskService.getUserTaskProgress(req.user!.id);
    res.json({
      success: true,
      data: { progress, count: progress.length },
    });
  })
);

router.post(
  '/complete',
  authenticate,
  validate(taskCompletionSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await TaskService.completeTask({
      userId: req.user!.id,
      taskId: req.body.taskId,
      completionTimeSeconds: req.body.completionTimeSeconds,
      accuracyPercentage: req.body.accuracyPercentage,
    });

    // Send real-time notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user!.id}`).emit('task_completed', result);
    }

    res.status(201).json({
      success: true,
      message: 'Task completed successfully',
      data: result,
    });
  })
);

router.post(
  '/',
  authenticate,
  validate(createTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await TaskService.createTask(req.body);
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task },
    });
  })
);

router.patch(
  '/:taskId',
  authenticate,
  asyncHandler(async (req, res) => {
    const task = await TaskService.updateTask(req.params.taskId, req.body);
    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task },
    });
  })
);

export default router;
