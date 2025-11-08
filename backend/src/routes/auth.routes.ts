import { Router } from 'express';
import Joi from 'joi';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  displayName: Joi.string().min(2).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(100).required(),
});

// Routes
router.post(
  '/register',
  strictRateLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  })
);

router.post(
  '/login',
  strictRateLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body);
    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  })
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await AuthService.changePassword(
      req.user!.id,
      req.body.oldPassword,
      req.body.newPassword
    );
    res.json({
      success: true,
      message: 'Password changed successfully',
      data: result,
    });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    res.json({
      success: true,
      data: { user: req.user },
    });
  })
);

export default router;
