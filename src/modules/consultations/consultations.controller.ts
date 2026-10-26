import { Request, Response, NextFunction } from 'express';
import { consultationsService } from './consultations.service.js';
import { ValidationError } from '../../core/errors.js';

export class ConsultationsController {
  async getConsultationById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await consultationsService.getConsultationById(
        id,
        req.user?.id,
        req.user?.role
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listConsultations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await consultationsService.listConsultations(
        req.user?.id,
        req.user?.role
      );
      res.status(200).json({ data: result, total: result.length });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status } = req.body;
      if (!status) throw new ValidationError('status is required');
      const result = await consultationsService.updateStatus(id, status);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async saveSoapNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { notes } = req.body;
      if (!notes) throw new ValidationError('notes text is required');
      const doctorId = req.user?.id || 'd1111111-1111-1111-1111-111111111111';
      const result = await consultationsService.saveSoapNotes(id, doctorId, notes);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const consultationsController = new ConsultationsController();
