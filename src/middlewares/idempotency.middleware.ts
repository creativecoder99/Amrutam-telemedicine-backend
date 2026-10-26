import { Request, Response, NextFunction } from 'express';
import { dbStore, IdempotencyRecord } from '../database/store.js';
import { ConflictError } from '../core/errors.js';

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    return next();
  }

  const existing = dbStore.idempotencyKeys.get(idempotencyKey);
  if (existing) {
    if (existing.status === 'COMPLETED') {
      res.setHeader('X-Cache-Lookup', 'HIT');
      return res.status(existing.responseStatus || 200).json(existing.responseBody);
    }
    if (existing.status === 'PENDING') {
      return next(
        new ConflictError('A request with this Idempotency-Key is currently being processed.')
      );
    }
  }

  // Set pending record
  const record: IdempotencyRecord = {
    key: idempotencyKey,
    userId: req.user?.id,
    requestPath: req.originalUrl,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
  };
  dbStore.idempotencyKeys.set(idempotencyKey, record);

  // Intercept response to store result
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    record.status = 'COMPLETED';
    record.responseStatus = res.statusCode;
    record.responseBody = body;
    dbStore.idempotencyKeys.set(idempotencyKey, record);
    return originalJson(body);
  };

  next();
}
