import { describe, it } from 'node:test';
import assert from 'node:assert';
import { bookingsService } from '../../src/modules/bookings/bookings.service.js';
import { paymentsService } from '../../src/modules/payments/payments.service.js';
import { dbStore } from '../../src/database/store.js';

describe('Booking & Payment Saga Lifecycle', () => {
  it('should successfully hold a slot, initiate checkout, and confirm booking', async () => {
    // Pick an available slot
    const slot = Array.from(dbStore.slots.values()).find((s) => s.status === 'AVAILABLE');
    assert.ok(slot, 'Should have an available slot');

    const patientId = '55555555-5555-5555-5555-555555555555';

    // 1. Hold Slot (10-minute hold)
    const holdRes = await bookingsService.holdSlot(slot.id, patientId);
    assert.strictEqual(holdRes.status, 'HELD');
    assert.strictEqual(holdRes.heldByPatientId, patientId);
    assert.ok(holdRes.holdExpiresAt);

    // 2. Create Checkout Session
    const checkoutRes = await paymentsService.createCheckout(slot.id, patientId);
    assert.ok(checkoutRes.orderId);
    assert.strictEqual(checkoutRes.amount, 650);

    // 3. Process Payment & Complete Saga
    const payRes = await paymentsService.processPayment(checkoutRes.orderId, 'UPI');
    assert.strictEqual(payRes.success, true);
    assert.strictEqual(payRes.consultation.status, 'SCHEDULED');

    // 4. Verify slot is now BOOKED
    const updatedSlot = dbStore.slots.get(slot.id);
    assert.strictEqual(updatedSlot?.status, 'BOOKED');
  });
});
