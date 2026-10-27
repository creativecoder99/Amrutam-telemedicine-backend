import { Request, Response, NextFunction } from 'express';
import { payoutsService } from './payouts.service.js';
import { ValidationError } from '../../core/errors.js';

export class PayoutsController {
  async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = (req.query.doctorId as string) || req.user?.id || 'd1111111-1111-1111-1111-111111111111';
      const wallet = await payoutsService.getDoctorWallet(doctorId);
      res.status(200).json(wallet);
    } catch (err) {
      next(err);
    }
  }

  async requestPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { doctorId, amount, accountDetails } = req.body;
      const targetDoctorId = doctorId || req.user?.id || 'd1111111-1111-1111-1111-111111111111';

      if (!amount || isNaN(Number(amount))) {
        throw new ValidationError('Valid payout amount is required (min ₹1,000)');
      }
      if (!accountDetails || (!accountDetails.upiId && !accountDetails.accountNumber)) {
        throw new ValidationError('Account details (UPI ID or Bank Account + IFSC) are required');
      }

      const payout = await payoutsService.requestPayout({
        doctorId: targetDoctorId,
        amount: Number(amount),
        accountDetails,
      });

      res.status(201).json(payout);
    } catch (err) {
      next(err);
    }
  }

  async getDoctorPayoutHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = (req.query.doctorId as string) || req.user?.id || 'd1111111-1111-1111-1111-111111111111';
      const history = await payoutsService.getDoctorPayoutHistory(doctorId);
      res.status(200).json({ data: history, total: history.length });
    } catch (err) {
      next(err);
    }
  }

  async listAllPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string;
      const requests = await payoutsService.listAllPayoutRequests(status);
      res.status(200).json({ data: requests, total: requests.length });
    } catch (err) {
      next(err);
    }
  }

  async processPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const payoutId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, adminNotes } = req.body;

      if (!['PROCESSED', 'REJECTED'].includes(status)) {
        throw new ValidationError("Status must be either 'PROCESSED' or 'REJECTED'");
      }

      const updated = await payoutsService.processPayout(payoutId, status, adminNotes);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}

export const payoutsController = new PayoutsController();
