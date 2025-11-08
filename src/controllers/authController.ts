import { Request, Response } from 'express';
import Joi from 'joi';
import { AuthService } from '../services/authService';
import logger from '../utils/logger';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  password: Joi.string().min(8).required(),
  fullName: Joi.string().min(2).required(),
  pin: Joi.string().pattern(/^[0-9]{4,6}$/).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = registerSchema.validate(req.body);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const user = await AuthService.registerUser(value);
      const token = AuthService.generateToken(user.id);

      res.status(201).json({
        message: 'User registered successfully',
        user,
        token
      });

    } catch (error: any) {
      logger.error('Registration error', error);

      if (error.code === '23505') { // Unique violation
        res.status(409).json({ error: 'Email or phone already registered' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = loginSchema.validate(req.body);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const result = await AuthService.loginUser(value.email, value.password);

      if (!result) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      res.json({
        message: 'Login successful',
        user: result.user,
        token: result.token
      });

    } catch (error) {
      logger.error('Login error', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  static async verifyPin(req: Request, res: Response): Promise<void> {
    try {
      const { pin } = req.body;
      const userId = (req as any).user.id;

      if (!pin || !/^[0-9]{4,6}$/.test(pin)) {
        res.status(400).json({ error: 'Invalid PIN format' });
        return;
      }

      const valid = await AuthService.verifyPin(userId, pin);

      res.json({ valid });

    } catch (error) {
      logger.error('PIN verification error', error);
      res.status(500).json({ error: 'PIN verification failed' });
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      res.json({ user });
    } catch (error) {
      logger.error('Get profile error', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
}
