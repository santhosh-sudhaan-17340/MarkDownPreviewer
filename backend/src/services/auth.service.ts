import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
  private static readonly JWT_SECRET = process.env.JWT_SECRET || '';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  static async register(data: RegisterData) {
    try {
      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [data.email, data.username]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('User with this email or username already exists', 409);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS);

      // Insert user
      const result = await db.query(
        `INSERT INTO users (username, email, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, display_name, created_at`,
        [data.username, data.email, passwordHash, data.displayName]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = this.generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
      });

      logger.info('User registered successfully', { userId: user.id, username: user.username });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          createdAt: user.created_at,
        },
        token,
      };
    } catch (error) {
      logger.error('Registration error', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  static async login(data: LoginData) {
    try {
      // Find user
      const result = await db.query(
        `SELECT id, username, email, password_hash, display_name, is_active, is_banned
         FROM users
         WHERE email = $1`,
        [data.email]
      );

      if (result.rows.length === 0) {
        throw new AppError('Invalid email or password', 401);
      }

      const user = result.rows[0];

      // Check if account is active
      if (!user.is_active || user.is_banned) {
        throw new AppError('Account is disabled or banned', 403);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);

      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Generate JWT token
      const token = this.generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
      });

      logger.info('User logged in successfully', { userId: user.id, username: user.username });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
        },
        token,
      };
    } catch (error) {
      logger.error('Login error', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  static async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        id: string;
        username: string;
        email: string;
      };

      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }

  private static generateToken(payload: { id: string; username: string; email: string }): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  static async changePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      // Get current password hash
      const result = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const user = result.rows[0];

      // Verify old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);

      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401);
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      logger.info('Password changed successfully', { userId });

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Password change error', { error: error instanceof Error ? error.message : 'Unknown error', userId });
      throw error;
    }
  }
}
