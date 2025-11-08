import { Router } from 'express';
import Joi from 'joi';
import { RankingService } from '../services/ranking.service';
import { StreakService } from '../services/streak.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validateQuery } from '../middleware/validate';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const paginationSchema = Joi.object({
  limit: Joi.number().min(1).max(100).default(100),
  offset: Joi.number().min(0).default(0),
});

const timeframeSchema = Joi.object({
  timeframe: Joi.string().valid('day', 'week', 'month').default('week'),
  limit: Joi.number().min(1).max(50).default(10),
});

const rangeSchema = Joi.object({
  range: Joi.number().min(1).max(20).default(5),
});

// Routes
router.get(
  '/global',
  optionalAuth,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const { limit, offset } = req.query as any;
    const rankings = await RankingService.getGlobalRankings(limit, offset);
    res.json({
      success: true,
      data: { rankings, count: rankings.length, limit, offset },
    });
  })
);

router.get(
  '/group/:groupId',
  authenticate,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const { limit, offset } = req.query as any;
    const rankings = await RankingService.getGroupRankings(req.params.groupId, limit, offset);
    res.json({
      success: true,
      data: { rankings, count: rankings.length, limit, offset },
    });
  })
);

router.get(
  '/user/:userId/rank',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const rankData = await RankingService.getUserRank(req.params.userId);
    res.json({
      success: true,
      data: rankData,
    });
  })
);

router.get(
  '/user/:userId/rank/group/:groupId',
  authenticate,
  asyncHandler(async (req, res) => {
    const rankData = await RankingService.getUserRank(req.params.userId, req.params.groupId);
    res.json({
      success: true,
      data: rankData,
    });
  })
);

router.get(
  '/user/:userId/around',
  authenticate,
  validateQuery(rangeSchema),
  asyncHandler(async (req, res) => {
    const { range } = req.query as any;
    const result = await RankingService.getUsersAroundRank(req.params.userId, range);
    res.json({
      success: true,
      data: result,
    });
  })
);

router.get(
  '/top-performers',
  validateQuery(timeframeSchema),
  asyncHandler(async (req, res) => {
    const { timeframe, limit } = req.query as any;
    const topPerformers = await RankingService.getTopPerformers(timeframe, limit);
    res.json({
      success: true,
      data: { topPerformers, count: topPerformers.length, timeframe },
    });
  })
);

router.get(
  '/streaks',
  validateQuery(Joi.object({ limit: Joi.number().min(1).max(50).default(10) })),
  asyncHandler(async (req, res) => {
    const { limit } = req.query as any;
    const streakLeaderboard = await StreakService.getStreakLeaderboard(limit);
    res.json({
      success: true,
      data: { leaderboard: streakLeaderboard, count: streakLeaderboard.length },
    });
  })
);

export default router;
