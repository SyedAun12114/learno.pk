import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const code = err.statusCode || 500;
  logger.error(req.method + ' ' + req.path + ' - ' + code + ': ' + err.message);
  if (process.env.NODE_ENV === 'production') {
    res.status(code).json({
      success: false,
      error: err.isOperational ? err.message : 'An unexpected error occurred.',
    });
  } else {
    res.status(code).json({ success: false, error: err.message, stack: err.stack });
  }
}
