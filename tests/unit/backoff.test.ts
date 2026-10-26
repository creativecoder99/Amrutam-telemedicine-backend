import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateFullJitterBackoff, retryWithBackoff } from '../../src/utils/backoff.js';

describe('Exponential Backoff with Full Jitter', () => {
  it('should generate delays within valid bounds', () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const delay = calculateFullJitterBackoff(attempt, 50, 2000);
      const maxPossible = Math.min(2000, 50 * Math.pow(2, attempt));
      assert.ok(delay >= 0 && delay <= maxPossible);
    }
  });

  it('should successfully retry and return value', async () => {
    let callCount = 0;
    const result = await retryWithBackoff(async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error('Temporary failure');
      }
      return 'recovered';
    }, 3, 10, 50);

    assert.strictEqual(result, 'recovered');
    assert.strictEqual(callCount, 2);
  });
});
