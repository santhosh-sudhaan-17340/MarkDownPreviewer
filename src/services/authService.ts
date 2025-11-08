import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { config } from '../config/config';
import { User } from '../types';
import logger from '../utils/logger';

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      logger.error('Token verification failed', error);
      return null;
    }
  }

  static async registerUser(data: {
    email: string;
    phone: string;
    password: string;
    fullName: string;
    pin: string;
  }): Promise<User> {
    const { email, phone, password, fullName, pin } = data;

    const passwordHash = await this.hashPassword(password);
    const pinHash = await this.hashPassword(pin);

    const result = await query(
      `INSERT INTO users (email, phone, password_hash, full_name, pin_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, phone, full_name, is_verified, is_active, created_at, updated_at`,
      [email, phone, passwordHash, fullName, pinHash]
    );

    logger.info(`User registered: ${email}`);
    return result.rows[0];
  }

  static async loginUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    const isValidPassword = await this.verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      logger.warn(`Failed login attempt for: ${email}`);
      return null;
    }

    const token = this.generateToken(user.id);

    delete user.password_hash;
    delete user.pin_hash;

    logger.info(`User logged in: ${email}`);
    return { user, token };
  }

  static async verifyPin(userId: string, pin: string): Promise<boolean> {
    const result = await query(
      'SELECT pin_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return this.verifyPassword(pin, result.rows[0].pin_hash);
  }

  static async getUserById(userId: string): Promise<User | null> {
    const result = await query(
      'SELECT id, email, phone, full_name, is_verified, is_active, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0] || null;
  }
}
