import { Router } from 'express';
import { doctorsController } from './doctors.controller.js';
import { rateLimitMiddleware } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.get('/', rateLimitMiddleware(120, 60), (req, res, next) => doctorsController.listDoctors(req, res, next));
router.get('/:id', rateLimitMiddleware(120, 60), (req, res, next) => doctorsController.getDoctorById(req, res, next));

export const doctorRoutes = router;
