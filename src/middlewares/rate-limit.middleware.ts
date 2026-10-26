import { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../config/redis.js';

export function rateLimitMiddleware(limit = 120, windowSeconds = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.user?.id || req.ip || 'anonymous';
    const key = `ratelimit:${req.baseUrl || req.path}:${identifier}`;

    const result = await checkRateLimit(key, limit, windowSeconds);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetSeconds);

    if (!result.allowed) {
      return res.status(429).json({
        type: 'https://amrutam.co.in/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
        detail: `Rate limit of ${limit} requests per ${windowSeconds}s exceeded. Try again in ${result.resetSeconds} seconds.`,
      });
    }

    next();
  };
}
