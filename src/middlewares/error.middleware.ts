import { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/errors.js';
import { logger } from '../config/logger.js';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn(
      {
        path: req.originalUrl,
        code: err.code,
        status: err.statusCode,
        message: err.message,
      },
      'Operational application error'
    );

    return res.status(err.statusCode).json({
      type: `https://amrutam.co.in/errors/${err.code.toLowerCase()}`,
      title: err.name,
      status: err.statusCode,
      detail: err.message,
      instance: req.originalUrl,
      details: err.details,
    });
  }

  // Unhandled server errors
  logger.error({ err, path: req.originalUrl }, 'Unhandled internal server exception');

  return res.status(500).json({
    type: 'https://amrutam.co.in/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected internal error occurred on the Amrutam Telemedicine Engine.',
    instance: req.originalUrl,
  });
}
