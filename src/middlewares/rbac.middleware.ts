import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../core/errors.js';

export function requireRole(...allowedRoles: Array<'PATIENT' | 'DOCTOR' | 'ADMIN' | 'AUDITOR'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: User role '${req.user.role}' is not authorized to access this resource. Allowed: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}
