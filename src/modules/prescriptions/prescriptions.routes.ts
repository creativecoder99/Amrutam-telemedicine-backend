import { Router } from 'express';
import { prescriptionsController } from './prescriptions.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { auditAction } from '../../middlewares/audit.middleware.js';

const router = Router();

router.get(
  '/',
  optionalAuthMiddleware,
  (req, res, next) => prescriptionsController.listPatientPrescriptions(req, res, next)
);

router.get(
  '/:id',
  optionalAuthMiddleware,
  auditAction('PRESCRIPTION_DOWNLOADED', 'PRESCRIPTION'),
  (req, res, next) => prescriptionsController.getPrescriptionById(req, res, next)
);

router.post(
  '/',
  optionalAuthMiddleware,
  auditAction('PRESCRIPTION_CREATED', 'PRESCRIPTION'),
  (req, res, next) => prescriptionsController.createPrescription(req, res, next)
);

export const prescriptionRoutes = router;
