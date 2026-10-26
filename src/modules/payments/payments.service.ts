import crypto from 'crypto';
import { dbStore } from '../../database/store.js';
import { bookingsService } from '../bookings/bookings.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors.js';
import { generateHmacSignature, verifyHmacSignature } from '../../utils/crypto.js';

export interface PaymentRecord {
  id: string;
  orderId: string;
  slotId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  createdAt: string;
}

const paymentsMap = new Map<string, PaymentRecord>();

export class PaymentsService {
  async createCheckout(slotId: string, patientId: string) {
    const slot = dbStore.slots.get(slotId);
    if (!slot) throw new NotFoundError('AvailabilitySlot', slotId);

    const doctor = dbStore.doctors.get(slot.doctorId);
    if (!doctor) throw new NotFoundError('Doctor', slot.doctorId);

    const orderId = `order_${crypto.randomUUID().slice(0, 12)}`;
    const paymentId = crypto.randomUUID();

    const record: PaymentRecord = {
      id: paymentId,
      orderId,
      slotId,
      patientId,
      doctorId: doctor.id,
      amount: doctor.consultationFee,
      currency: 'INR',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    paymentsMap.set(orderId, record);

    return {
      orderId,
      slotId,
      doctorName: doctor.fullName,
      specialty: doctor.primarySpecialty,
      startTime: slot.startTime,
      amount: doctor.consultationFee,
      currency: 'INR',
      holdExpiresAt: slot.holdExpiresAt,
      gatewayDetails: {
        keyId: 'rzp_test_amrutam_telehealth',
        name: 'Amrutam Holistic Ayurveda',
        description: `Consultation with ${doctor.fullName}`,
      },
    };
  }

  async processPayment(orderId: string, paymentMethod = 'UPI', idempotencyKey?: string) {
    const record = paymentsMap.get(orderId);
    if (!record) throw new NotFoundError('PaymentOrder', orderId);

    if (record.status === 'CAPTURED') {
      return {
        success: true,
        transactionId: record.transactionId,
        status: record.status,
        message: 'Payment was already captured successfully.',
      };
    }

    // Simulate gateway capture
    const transactionId = `txn_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    record.status = 'CAPTURED';
    record.transactionId = transactionId;
    paymentsMap.set(orderId, record);

    // Finalize booking via Saga
    const bookingResult = await bookingsService.confirmBooking(
      record.slotId,
      record.patientId,
      transactionId
    );

    return {
      success: true,
      transactionId,
      amount: record.amount,
      currency: record.currency,
      consultation: bookingResult.consultation,
      message: 'Payment authorized and consultation confirmed.',
    };
  }

  async processWebhook(payload: any, signature?: string) {
    const payloadStr = JSON.stringify(payload);
    if (signature) {
      const isValid = verifyHmacSignature(payloadStr, signature);
      if (!isValid) {
        throw new ValidationError('Invalid webhook cryptographic signature');
      }
    }

    const { orderId } = payload;
    if (orderId && paymentsMap.has(orderId)) {
      return this.processPayment(orderId, 'WEBHOOK');
    }

    return { received: true };
  }

  async refund(transactionId: string, reason: string) {
    const record = Array.from(paymentsMap.values()).find((p) => p.transactionId === transactionId);
    if (!record) throw new NotFoundError('PaymentTransaction', transactionId);

    record.status = 'REFUNDED';
    return {
      transactionId,
      status: 'REFUNDED',
      refundAmount: record.amount,
      reason,
      refundedAt: new Date().toISOString(),
    };
  }
}

export const paymentsService = new PaymentsService();
