import { Router } from 'express';
import { doctorsController } from './doctors.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { rateLimitMiddleware } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.get('/', rateLimitMiddleware(120, 60), (req, res, next) => doctorsController.listDoctors(req, res, next));
router.get('/:id', rateLimitMiddleware(120, 60), (req, res, next) => doctorsController.getDoctorById(req, res, next));
router.post('/', optionalAuthMiddleware, (req, res, next) => doctorsController.createDoctor(req, res, next));
router.patch('/:id/verify', optionalAuthMiddleware, (req, res, next) => doctorsController.verifyDoctor(req, res, next));
router.put('/:id', optionalAuthMiddleware, (req, res, next) => doctorsController.updateDoctor(req, res, next));
router.delete('/:id', optionalAuthMiddleware, (req, res, next) => doctorsController.deleteDoctor(req, res, next));

export const doctorRoutes = router;
