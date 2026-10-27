import crypto from 'crypto';
import { dbStore, PayoutRequestEntity, WalletEntity } from '../../database/store.js';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors.js';

export class PayoutsService {
  /**
   * Retrieves doctor remuneration wallet balance & earnings.
   */
  async getDoctorWallet(doctorId: string): Promise<WalletEntity & { canRequestPayout: boolean; threshold: number }> {
    let wallet = dbStore.wallets.get(doctorId);
    if (!wallet) {
      wallet = {
        id: crypto.randomUUID(),
        doctorId,
        balance: 0,
        totalEarned: 0,
        updatedAt: new Date().toISOString(),
      };
      dbStore.wallets.set(doctorId, wallet);
    }

    return {
      ...wallet,
      canRequestPayout: wallet.balance >= 1000,
      threshold: 1000,
    };
  }

  /**
   * Doctor requests payout when threshold >= 1,000 INR is reached.
   */
  async requestPayout(data: {
    doctorId: string;
    amount: number;
    accountDetails: {
      upiId?: string;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
  }): Promise<PayoutRequestEntity> {
    const MINIMUM_PAYOUT_THRESHOLD = 1000;

    if (!data.amount || data.amount < MINIMUM_PAYOUT_THRESHOLD) {
      throw new ValidationError(
        `Minimum payout withdrawal threshold is ₹${MINIMUM_PAYOUT_THRESHOLD}. Current request: ₹${data.amount || 0}.`
      );
    }

    let wallet = dbStore.wallets.get(data.doctorId);
    if (!wallet || wallet.balance < data.amount) {
      throw new ConflictError(
        `Insufficient wallet balance. Current balance is ₹${wallet?.balance || 0}, but ₹${data.amount} was requested.`
      );
    }

    const doctor = dbStore.doctors.get(data.doctorId);

    // Deduct from available balance into escrow
    wallet.balance -= data.amount;
    wallet.updatedAt = new Date().toISOString();
    dbStore.wallets.set(data.doctorId, wallet);

    const payoutId = crypto.randomUUID();
    const payout: PayoutRequestEntity = {
      id: payoutId,
      doctorId: data.doctorId,
      doctorName: doctor?.fullName || 'Vaidya Practitioner',
      amount: data.amount,
      status: 'PENDING',
      accountDetails: data.accountDetails,
      requestedAt: new Date().toISOString(),
    };

    dbStore.payoutRequests.set(payoutId, payout);

    dbStore.appendAuditLog(
      'PAYOUT_REQUESTED',
      'PAYOUT',
      payoutId,
      data.doctorId,
      'API',
      'Doctor Payout Engine'
    );

    return payout;
  }

  /**
   * Lists payout history for a specific doctor.
   */
  async getDoctorPayoutHistory(doctorId: string): Promise<PayoutRequestEntity[]> {
    return Array.from(dbStore.payoutRequests.values())
      .filter((p) => p.doctorId === doctorId)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  /**
   * Admin lists all payout requests across the platform.
   */
  async listAllPayoutRequests(status?: string): Promise<PayoutRequestEntity[]> {
    let requests = Array.from(dbStore.payoutRequests.values());
    if (status) {
      requests = requests.filter((r) => r.status.toUpperCase() === status.toUpperCase());
    }
    return requests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  /**
   * Admin processes payout: marks PROCESSED or REJECTED (refunds balance if rejected).
   */
  async processPayout(payoutId: string, status: 'PROCESSED' | 'REJECTED', adminNotes?: string): Promise<PayoutRequestEntity> {
    const payout = dbStore.payoutRequests.get(payoutId);
    if (!payout) {
      throw new NotFoundError('PayoutRequest', payoutId);
    }

    if (payout.status !== 'PENDING') {
      throw new ConflictError(`Payout request is already ${payout.status}.`);
    }

    payout.status = status;
    payout.processedAt = new Date().toISOString();
    payout.adminNotes = adminNotes;
    dbStore.payoutRequests.set(payoutId, payout);

    // If rejected, refund balance back to doctor's wallet
    if (status === 'REJECTED') {
      const wallet = dbStore.wallets.get(payout.doctorId);
      if (wallet) {
        wallet.balance += payout.amount;
        wallet.updatedAt = new Date().toISOString();
        dbStore.wallets.set(payout.doctorId, wallet);
      }
    }

    dbStore.appendAuditLog(
      `PAYOUT_${status}`,
      'PAYOUT',
      payoutId,
      'ADMIN',
      'API',
      adminNotes || 'Admin Payout Governance'
    );

    return payout;
  }
}

export const payoutsService = new PayoutsService();
