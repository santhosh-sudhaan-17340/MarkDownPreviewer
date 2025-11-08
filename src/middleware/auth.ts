import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../types';
import logger from '../utils/logger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);

    if (!decoded) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await AuthService.getUserById(decoded.userId);

    if (!user || !user.is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    logger.error('Authentication error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthRequest;

  if (!authReq.user?.is_verified) {
    res.status(403).json({ error: 'User not verified' });
    return;
  }

  next();
};
