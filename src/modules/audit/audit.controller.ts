import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service.js';

export class AuditController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, action, resource } = req.query;
      const logs = await auditService.getAuditLogs(
        limit ? Number(limit) : 100,
        action as string,
        resource as string
      );
      res.status(200).json({ data: logs, total: logs.length });
    } catch (err) {
      next(err);
    }
  }

  async verifyChain(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await auditService.verifyChainIntegrity();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
