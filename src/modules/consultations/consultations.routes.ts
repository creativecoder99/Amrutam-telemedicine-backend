import { Router } from 'express';
import { consultationsController } from './consultations.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { auditAction } from '../../middlewares/audit.middleware.js';

const router = Router();

router.get(
  '/',
  optionalAuthMiddleware,
  (req, res, next) => consultationsController.listConsultations(req, res, next)
);

router.get(
  '/:id',
  optionalAuthMiddleware,
  auditAction('CONSULTATION_VIEWED', 'CONSULTATION'),
  (req, res, next) => consultationsController.getConsultationById(req, res, next)
);

router.patch(
  '/:id/status',
  optionalAuthMiddleware,
  auditAction('CONSULTATION_STATUS_CHANGED', 'CONSULTATION'),
  (req, res, next) => consultationsController.updateStatus(req, res, next)
);

router.post(
  '/:id/soap-notes',
  optionalAuthMiddleware,
  auditAction('SOAP_NOTES_UPDATED', 'CONSULTATION'),
  (req, res, next) => consultationsController.saveSoapNotes(req, res, next)
);

export const consultationRoutes = router;
