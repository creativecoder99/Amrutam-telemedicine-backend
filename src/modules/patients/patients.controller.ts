import { Request, Response, NextFunction } from 'express';
import { patientsService } from './patients.service.js';

export class PatientsController {
  async listPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const patients = await patientsService.listPatients();
      res.status(200).json({ data: patients, total: patients.length });
    } catch (err) {
      next(err);
    }
  }

  async getPatientById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const patient = await patientsService.getPatientById(userId);
      res.status(200).json(patient);
    } catch (err) {
      next(err);
    }
  }

  async updatePatientProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await patientsService.updatePatientProfile(userId, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async deletePatient(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await patientsService.deletePatient(userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const patientsController = new PatientsController();
