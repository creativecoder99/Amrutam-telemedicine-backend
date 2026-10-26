import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service.js';
import { ValidationError } from '../../core/errors.js';

export class PaymentsController {
  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const { slotId } = req.body;
      if (!slotId) throw new ValidationError('slotId is required to initiate checkout');
      const patientId = req.user?.id || req.body.patientId || '55555555-5555-5555-5555-555555555555';
      const result = await paymentsService.createCheckout(slotId, patientId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, paymentMethod } = req.body;
      if (!orderId) throw new ValidationError('orderId is required');
      const idempotencyKey = req.headers['idempotency-key'] as string;
      const result = await paymentsService.processPayment(orderId, paymentMethod, idempotencyKey);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-amrutam-signature'] as string;
      const result = await paymentsService.processWebhook(req.body, signature);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async refund(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId, reason } = req.body;
      if (!transactionId) throw new ValidationError('transactionId is required for refund');
      const result = await paymentsService.refund(transactionId, reason || 'Patient requested refund');
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const paymentsController = new PaymentsController();
