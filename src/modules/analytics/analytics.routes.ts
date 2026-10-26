import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/summary', optionalAuthMiddleware, (req, res, next) => analyticsController.getSummary(req, res, next));

export const analyticsRoutes = router;
