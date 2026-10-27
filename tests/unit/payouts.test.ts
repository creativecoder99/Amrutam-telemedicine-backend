import { describe, it } from 'node:test';
import assert from 'node:assert';
import { payoutsService } from '../../src/modules/payouts/payouts.service.js';
import { dbStore } from '../../src/database/store.js';

describe('Doctor Remuneration Wallet & Payout System', () => {
  const testDoctorId = 'd-payout-test-01';

  it('should initialize doctor wallet with balance', async () => {
    // Manually credit doctor wallet with ₹1,200 (6 consultations * ₹200)
    dbStore.wallets.set(testDoctorId, {
      id: 'w-test',
      doctorId: testDoctorId,
      balance: 1200,
      totalEarned: 1200,
      updatedAt: new Date().toISOString(),
    });

    const wallet = await payoutsService.getDoctorWallet(testDoctorId);
    assert.strictEqual(wallet.balance, 1200);
    assert.strictEqual(wallet.canRequestPayout, true);
    assert.strictEqual(wallet.threshold, 1000);
  });

  it('should reject payout request below ₹1,000 threshold', async () => {
    await assert.rejects(
      async () => {
        await payoutsService.requestPayout({
          doctorId: testDoctorId,
          amount: 500, // Below threshold
          accountDetails: { upiId: 'doctor@upi' },
        });
      },
      {
        name: 'ValidationError',
        message: /Minimum payout withdrawal threshold is ₹1000/,
      }
    );
  });

  it('should reject payout request exceeding available balance', async () => {
    await assert.rejects(
      async () => {
        await payoutsService.requestPayout({
          doctorId: testDoctorId,
          amount: 5000, // Exceeds 1200 balance
          accountDetails: { upiId: 'doctor@upi' },
        });
      },
      {
        name: 'ConflictError',
        message: /Insufficient wallet balance/,
      }
    );
  });

  it('should successfully create payout request and deduct balance into escrow', async () => {
    const payout = await payoutsService.requestPayout({
      doctorId: testDoctorId,
      amount: 1000,
      accountDetails: {
        upiId: 'doctor.rajesh@okhdfcbank',
      },
    });

    assert.strictEqual(payout.amount, 1000);
    assert.strictEqual(payout.status, 'PENDING');

    const updatedWallet = await payoutsService.getDoctorWallet(testDoctorId);
    assert.strictEqual(updatedWallet.balance, 200, 'Balance must decrease by requested amount (1200 - 1000 = 200)');
  });

  it('should allow admin to process payout', async () => {
    const pendingList = await payoutsService.listAllPayoutRequests('PENDING');
    const target = pendingList.find((p) => p.doctorId === testDoctorId);
    assert.ok(target, 'Should have pending payout request');

    const processed = await payoutsService.processPayout(target.id, 'PROCESSED', 'Transacted via Razorpay Payouts Batch #1029');
    assert.strictEqual(processed.status, 'PROCESSED');
    assert.ok(processed.processedAt);
  });
});
