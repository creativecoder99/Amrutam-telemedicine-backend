import { Request, Response, NextFunction } from 'express';
import { doctorsService } from './doctors.service.js';

export class DoctorsController {
  async listDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const { specialty, maxFee, minRating, q } = req.query;
      const doctors = await doctorsService.listDoctors({
        specialty: specialty as string,
        maxFee: maxFee ? Number(maxFee) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        searchQuery: q as string,
      });
      res.status(200).json({ data: doctors, total: doctors.length });
    } catch (err) {
      next(err);
    }
  }

  async getDoctorById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const doctor = await doctorsService.getDoctorById(id);
      res.status(200).json(doctor);
    } catch (err) {
      next(err);
    }
  }
}

export const doctorsController = new DoctorsController();
