import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeAuditHash } from '../../src/utils/crypto.js';
import { auditService } from '../../src/modules/audit/audit.service.js';
import { dbStore } from '../../src/database/store.js';

describe('Audit Log Cryptographic Hash Chaining', () => {
  it('should verify genesis and subsequent chained log records', async () => {
    // Append a new test log
    dbStore.appendAuditLog('TEST_ACTION_1', 'TEST_RESOURCE', 'res-101', 'user-001');
    dbStore.appendAuditLog('TEST_ACTION_2', 'TEST_RESOURCE', 'res-102', 'user-001');

    const verification = await auditService.verifyChainIntegrity();
    assert.strictEqual(verification.isValid, true);
    assert.strictEqual(verification.brokenIndex, null);
  });

  it('should detect tampering if a historical record hash is modified', async () => {
    // Temporarily mutate a record in the chain
    const originalHash = dbStore.auditLogs[0].recordHash;
    dbStore.auditLogs[0].recordHash = '0000000000000000000000000000000000000000000000000000000000000000';

    const verification = await auditService.verifyChainIntegrity();
    assert.strictEqual(verification.isValid, false);
    assert.ok(verification.brokenIndex !== null);

    // Restore
    dbStore.auditLogs[0].recordHash = originalHash;
  });
});
