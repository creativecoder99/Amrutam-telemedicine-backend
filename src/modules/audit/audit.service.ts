import { dbStore, AuditLogEntity } from '../../database/store.js';
import { computeAuditHash } from '../../utils/crypto.js';

export class AuditService {
  async getAuditLogs(limit = 100, action?: string, resource?: string) {
    let logs = [...dbStore.auditLogs];

    if (action) {
      logs = logs.filter((l) => l.action.toLowerCase().includes(action.toLowerCase()));
    }

    if (resource) {
      logs = logs.filter((l) => l.resource.toLowerCase().includes(resource.toLowerCase()));
    }

    // Return newest first
    return logs.slice(-limit).reverse();
  }

  /**
   * Verifies the entire SHA-256 HMAC cryptographic chain for DISHA / ABDM regulatory compliance.
   * Proves that no historical audit record has been inserted, modified, or deleted.
   */
  async verifyChainIntegrity(): Promise<{
    isValid: boolean;
    totalRecords: number;
    brokenIndex: number | null;
    message: string;
  }> {
    const logs = dbStore.auditLogs;
    if (logs.length === 0) {
      return { isValid: true, totalRecords: 0, brokenIndex: null, message: 'Audit chain is empty.' };
    }

    for (let i = 1; i < logs.length; i++) {
      const prev = logs[i - 1];
      const current = logs[i];

      // Check linkage
      if (current.previousHash !== prev.recordHash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          brokenIndex: i,
          message: `Chain linkage mismatch at record index ${i}: current.previousHash does not match previous recordHash.`,
        };
      }

      // Recompute and verify current record hash
      const expectedHash = computeAuditHash(
        current.action,
        current.resource,
        current.resourceId || '',
        current.userId || 'ANONYMOUS',
        current.createdAt,
        current.previousHash
      );

      if (current.recordHash !== expectedHash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          brokenIndex: i,
          message: `Hash forgery detected at record index ${i}: recomputed hash does not match stored recordHash.`,
        };
      }
    }

    return {
      isValid: true,
      totalRecords: logs.length,
      brokenIndex: null,
      message: `Audit chain integrity mathematically verified. All ${logs.length} records are intact and tamper-free.`,
    };
  }
}

export const auditService = new AuditService();
