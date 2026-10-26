import { Router } from 'express';
import { availabilityController } from './availability.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { rateLimitMiddleware } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.get('/:doctorId', rateLimitMiddleware(120, 60), (req, res, next) => availabilityController.getDoctorSlots(req, res, next));
router.post(
  '/:doctorId/generate',
  authMiddleware,
  requireRole('DOCTOR', 'ADMIN'),
  (req, res, next) => availabilityController.generateSlots(req, res, next)
);

export const availabilityRoutes = router;
