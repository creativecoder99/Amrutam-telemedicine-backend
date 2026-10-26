import crypto from 'crypto';
import { dbStore, ConsultationEntity } from '../../database/store.js';
import { acquireDistributedLock, releaseDistributedLock } from '../../config/redis.js';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors.js';
import {
  slotHoldAttemptsCounter,
  doubleBookingConflictsPrevented,
  activeSlotHoldsGauge,
} from '../../config/metrics.js';

export class BookingsService {
  /**
   * Holds a consultation slot for 10 minutes with absolute concurrency guarantee.
   * Uses Redis Redlock distributed lock + status check + row-level state transition.
   */
  async holdSlot(slotId: string, patientId: string) {
    slotHoldAttemptsCounter.inc({ status: 'attempt' });
    dbStore.cleanExpiredHolds();

    const lockKey = `lock:slot:${slotId}`;
    const { acquired, token } = await acquireDistributedLock(lockKey, 10000); // 10s mutex lock

    if (!acquired) {
      doubleBookingConflictsPrevented.inc();
      slotHoldAttemptsCounter.inc({ status: 'lock_conflict' });
      throw new ConflictError(
        'This slot is currently being locked by another concurrent patient transaction. Please try another slot.'
      );
    }

    try {
      const slot = dbStore.slots.get(slotId);
      if (!slot) {
        throw new NotFoundError('AvailabilitySlot', slotId);
      }

      if (slot.status !== 'AVAILABLE') {
        doubleBookingConflictsPrevented.inc();
        slotHoldAttemptsCounter.inc({ status: 'already_taken' });
        throw new ConflictError(
          `Slot is no longer available. Current status: '${slot.status}'. Please select another consultation time.`
        );
      }

      // 10-Minute Hold Window
      const holdDurationMs = 10 * 60 * 1000;
      const expiresAt = new Date(Date.now() + holdDurationMs).toISOString();

      slot.status = 'HELD';
      slot.heldByPatientId = patientId;
      slot.holdExpiresAt = expiresAt;
      dbStore.slots.set(slotId, slot);

      activeSlotHoldsGauge.inc();
      slotHoldAttemptsCounter.inc({ status: 'held_success' });

      return {
        slotId: slot.id,
        doctorId: slot.doctorId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        heldByPatientId: slot.heldByPatientId,
        holdExpiresAt: slot.holdExpiresAt,
        ttlSeconds: 600,
        message: 'Slot successfully reserved for 10 minutes. Please complete checkout before the timer expires.',
      };
    } finally {
      await releaseDistributedLock(lockKey, token);
    }
  }

  async releaseHold(slotId: string, patientId: string) {
    const slot = dbStore.slots.get(slotId);
    if (!slot) throw new NotFoundError('AvailabilitySlot', slotId);

    if (slot.status === 'HELD' && slot.heldByPatientId === patientId) {
      slot.status = 'AVAILABLE';
      slot.heldByPatientId = undefined;
      slot.holdExpiresAt = undefined;
      dbStore.slots.set(slotId, slot);
      activeSlotHoldsGauge.dec();
      return { success: true, message: 'Hold released successfully' };
    }

    return { success: false, message: 'Slot was not held by this user' };
  }

  /**
   * Finalizes reservation and creates scheduled consultation upon payment verification.
   */
  async confirmBooking(slotId: string, patientId: string, paymentTransactionId: string) {
    const slot = dbStore.slots.get(slotId);
    if (!slot) throw new NotFoundError('AvailabilitySlot', slotId);

    if (slot.status === 'BOOKED') {
      throw new ConflictError('Slot is already permanently booked.');
    }

    if (slot.status === 'HELD' && slot.heldByPatientId !== patientId) {
      throw new ConflictError('Slot is currently held by another patient.');
    }

    // Mark slot as booked
    slot.status = 'BOOKED';
    slot.heldByPatientId = patientId;
    slot.holdExpiresAt = undefined;
    dbStore.slots.set(slotId, slot);
    activeSlotHoldsGauge.dec();

    // Create Consultation record
    const consultationId = crypto.randomUUID();
    const consultation: ConsultationEntity = {
      id: consultationId,
      patientId,
      doctorId: slot.doctorId,
      slotId: slot.id,
      scheduledStartTime: slot.startTime,
      scheduledEndTime: slot.endTime,
      status: 'SCHEDULED',
      roomSessionToken: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    dbStore.consultations.set(consultationId, consultation);

    return {
      consultation,
      slot,
      paymentTransactionId,
      message: 'Consultation successfully scheduled.',
    };
  }
}

export const bookingsService = new BookingsService();
