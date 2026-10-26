import { Request, Response, NextFunction } from 'express';
import { dbStore } from '../database/store.js';

export function auditAction(actionName: string, resourceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);

    res.send = (body: any) => {
      // Only log successful operations or sensitive state changes
      if (res.statusCode < 400) {
        const resourceId = (req.params.id || req.body?.id || req.body?.slotId || 'COLLECTION') as string;
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const ua = req.headers['user-agent'] || 'Unknown';

        dbStore.appendAuditLog(
          actionName,
          resourceName,
          resourceId,
          req.user?.id,
          ip,
          ua
        );
      }
      return originalSend(body);
    };

    next();
  };
}
