import { describe, it } from 'node:test';
import assert from 'node:assert';
import { bookingsService } from '../../src/modules/bookings/bookings.service.js';
import { dbStore } from '../../src/database/store.js';

describe('Concurrency & Zero Double-Booking Guarantee', () => {
  it('should allow exactly 1 reservation when 10 concurrent requests compete for the same slot', async () => {
    // Pick an available slot
    const slot = Array.from(dbStore.slots.values()).find((s) => s.status === 'AVAILABLE');
    assert.ok(slot, 'An available slot must exist');

    const totalConcurrentRequests = 10;
    const patientIds = Array.from({ length: totalConcurrentRequests }, (_, i) => `patient-concurrency-${i + 1}`);

    // Fire all 10 hold attempts concurrently
    const results = await Promise.allSettled(
      patientIds.map((pId) => bookingsService.holdSlot(slot.id, pId))
    );

    const successfulHolds = results.filter((r) => r.status === 'fulfilled');
    const rejectedHolds = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(
      successfulHolds.length,
      1,
      `Exactly 1 request must acquire the hold. Got ${successfulHolds.length} successes.`
    );
    assert.strictEqual(
      rejectedHolds.length,
      9,
      `Exactly 9 requests must be rejected. Got ${rejectedHolds.length} rejections.`
    );

    // Verify slot in store has status HELD
    const storedSlot = dbStore.slots.get(slot.id);
    assert.strictEqual(storedSlot?.status, 'HELD');
  });
});
