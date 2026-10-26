import { Request, Response, NextFunction } from 'express';
import { prescriptionsService } from './prescriptions.service.js';
import { ValidationError } from '../../core/errors.js';

export class PrescriptionsController {
  async createPrescription(req: Request, res: Response, next: NextFunction) {
    try {
      const { consultationId, doctorId, patientId, diagnosisNotes, dietaryAdvice, lifestyleInstructions, items } = req.body;
      if (!consultationId || !diagnosisNotes || !items || !Array.isArray(items)) {
        throw new ValidationError('Missing required fields: consultationId, diagnosisNotes, and items array');
      }

      const activeDoctorId = doctorId || req.user?.id || 'd1111111-1111-1111-1111-111111111111';
      const activePatientId = patientId || '55555555-5555-5555-5555-555555555555';

      const prescription = await prescriptionsService.createPrescription({
        consultationId,
        doctorId: activeDoctorId,
        patientId: activePatientId,
        diagnosisNotes,
        dietaryAdvice: dietaryAdvice || '',
        lifestyleInstructions: lifestyleInstructions || '',
        items,
      });

      res.status(201).json(prescription);
    } catch (err) {
      next(err);
    }
  }

  async getPrescriptionById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await prescriptionsService.getPrescriptionById(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listPatientPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.query.patientId as string || req.user?.id || '55555555-5555-5555-5555-555555555555';
      const result = await prescriptionsService.listPatientPrescriptions(patientId);
      res.status(200).json({ data: result, total: result.length });
    } catch (err) {
      next(err);
    }
  }
}

export const prescriptionsController = new PrescriptionsController();
