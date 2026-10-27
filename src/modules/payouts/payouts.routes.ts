import { Router } from 'express';
import { payoutsController } from './payouts.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

// Doctor routes
router.get('/wallet', optionalAuthMiddleware, (req, res, next) => payoutsController.getWallet(req, res, next));
router.post('/request', optionalAuthMiddleware, (req, res, next) => payoutsController.requestPayout(req, res, next));
router.get('/history', optionalAuthMiddleware, (req, res, next) => payoutsController.getDoctorPayoutHistory(req, res, next));

// Admin routes
router.get('/', optionalAuthMiddleware, (req, res, next) => payoutsController.listAllPayouts(req, res, next));
router.patch('/:id/process', optionalAuthMiddleware, (req, res, next) => payoutsController.processPayout(req, res, next));

export const payoutRoutes = router;
