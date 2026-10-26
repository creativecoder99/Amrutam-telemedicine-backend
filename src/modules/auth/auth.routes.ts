import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { rateLimitMiddleware } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.post('/register', rateLimitMiddleware(20, 60), (req, res, next) => authController.register(req, res, next));
router.post('/login', rateLimitMiddleware(30, 60), (req, res, next) => authController.login(req, res, next));
router.post('/mfa/verify', rateLimitMiddleware(10, 60), (req, res, next) => authController.verifyMfa(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));
router.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));

export const authRoutes = router;
