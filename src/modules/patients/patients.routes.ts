import { Router } from 'express';
import { patientsController } from './patients.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', optionalAuthMiddleware, (req, res, next) => patientsController.listPatients(req, res, next));
router.get('/:id', optionalAuthMiddleware, (req, res, next) => patientsController.getPatientById(req, res, next));
router.put('/:id', optionalAuthMiddleware, (req, res, next) => patientsController.updatePatientProfile(req, res, next));
router.delete('/:id', optionalAuthMiddleware, (req, res, next) => patientsController.deletePatient(req, res, next));

export const patientRoutes = router;
