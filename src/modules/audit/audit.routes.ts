import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', optionalAuthMiddleware, (req, res, next) => auditController.getAuditLogs(req, res, next));
router.get('/verify', optionalAuthMiddleware, (req, res, next) => auditController.verifyChain(req, res, next));

export const auditRoutes = router;
