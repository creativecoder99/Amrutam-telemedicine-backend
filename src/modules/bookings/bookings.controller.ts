import { Request, Response, NextFunction } from 'express';
import { bookingsService } from './bookings.service.js';
import { ValidationError } from '../../core/errors.js';

export class BookingsController {
  async holdSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const { slotId } = req.body;
      if (!slotId) {
        throw new ValidationError('slotId is required to reserve a consultation slot');
      }
      const patientId = req.user?.id || req.body.patientId || '55555555-5555-5555-5555-555555555555';
      const result = await bookingsService.holdSlot(slotId, patientId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async releaseHold(req: Request, res: Response, next: NextFunction) {
    try {
      const { slotId } = req.body;
      if (!slotId) {
        throw new ValidationError('slotId is required to release hold');
      }
      const patientId = req.user?.id || req.body.patientId || '55555555-5555-5555-5555-555555555555';
      const result = await bookingsService.releaseHold(slotId, patientId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async confirmBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { slotId, paymentTransactionId } = req.body;
      if (!slotId) {
        throw new ValidationError('slotId is required');
      }
      const patientId = req.user?.id || req.body.patientId || '55555555-5555-5555-5555-555555555555';
      const txnId = paymentTransactionId || `mock_tx_${Date.now()}`;
      const result = await bookingsService.confirmBooking(slotId, patientId, txnId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const bookingsController = new BookingsController();
