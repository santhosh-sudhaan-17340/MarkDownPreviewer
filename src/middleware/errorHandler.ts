import { Request, Response, NextFunction } from 'express';
import { OptimisticLockError } from '../types/models';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  if (error instanceof OptimisticLockError) {
    res.status(409).json({
      success: false,
      error: error.message,
      code: 'OPTIMISTIC_LOCK_ERROR',
    });
    return;
  }

  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
};
