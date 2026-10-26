import { Request, Response, NextFunction } from 'express';
import { availabilityService } from './availability.service.js';

export class AvailabilityController {
  async getDoctorSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = Array.isArray(req.params.doctorId) ? req.params.doctorId[0] : req.params.doctorId;
      const { startDate, endDate } = req.query;
      const slots = await availabilityService.getDoctorSlots(
        doctorId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ data: slots, total: slots.length });
    } catch (err) {
      next(err);
    }
  }

  async generateSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = Array.isArray(req.params.doctorId) ? req.params.doctorId[0] : req.params.doctorId;
      const { daysAhead } = req.body;
      const slots = await availabilityService.generateSlots(
        doctorId,
        daysAhead ? Number(daysAhead) : 14
      );
      res.status(201).json({ message: 'Slots generated successfully', count: slots.length, data: slots });
    } catch (err) {
      next(err);
    }
  }
}

export const availabilityController = new AvailabilityController();
