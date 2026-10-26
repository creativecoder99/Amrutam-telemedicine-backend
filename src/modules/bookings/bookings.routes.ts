import { Router } from 'express';
import { bookingsController } from './bookings.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { idempotencyMiddleware } from '../../middlewares/idempotency.middleware.js';
import { auditAction } from '../../middlewares/audit.middleware.js';
import { rateLimitMiddleware } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.post(
  '/hold',
  rateLimitMiddleware(60, 60),
  optionalAuthMiddleware,
  idempotencyMiddleware,
  auditAction('SLOT_HOLD_RESERVED', 'AVAILABILITY_SLOT'),
  (req, res, next) => bookingsController.holdSlot(req, res, next)
);

router.post(
  '/release',
  optionalAuthMiddleware,
  (req, res, next) => bookingsController.releaseHold(req, res, next)
);

router.post(
  '/confirm',
  optionalAuthMiddleware,
  idempotencyMiddleware,
  auditAction('BOOKING_CONFIRMED', 'CONSULTATION'),
  (req, res, next) => bookingsController.confirmBooking(req, res, next)
);

export const bookingRoutes = router;
