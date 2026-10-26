import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { idempotencyMiddleware } from '../../middlewares/idempotency.middleware.js';
import { auditAction } from '../../middlewares/audit.middleware.js';

const router = Router();

router.post(
  '/checkout',
  optionalAuthMiddleware,
  auditAction('PAYMENT_CHECKOUT_INITIATED', 'PAYMENT'),
  (req, res, next) => paymentsController.createCheckout(req, res, next)
);

router.post(
  '/process',
  optionalAuthMiddleware,
  idempotencyMiddleware,
  auditAction('PAYMENT_CHARGED', 'PAYMENT'),
  (req, res, next) => paymentsController.processPayment(req, res, next)
);

router.post(
  '/webhook',
  (req, res, next) => paymentsController.webhook(req, res, next)
);

router.post(
  '/refund',
  optionalAuthMiddleware,
  auditAction('PAYMENT_REFUNDED', 'PAYMENT'),
  (req, res, next) => paymentsController.refund(req, res, next)
);

export const paymentRoutes = router;
