import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  encryptData,
  decryptData,
  generateHmacSignature,
  verifyHmacSignature,
  computeSha256,
} from '../../src/utils/crypto.js';

describe('Cryptographic Engine & PHI Protection', () => {
  it('should encrypt and decrypt sensitive clinical notes correctly with AES-256-GCM', () => {
    const rawSoapNotes = 'S: Patient presents with chronic acid reflux and Pitta imbalance. P: Avipattikar Churna.';
    const encrypted = encryptData(rawSoapNotes);

    assert.notStrictEqual(encrypted, rawSoapNotes);
    assert.strictEqual(encrypted.split(':').length, 3, 'Payload must follow iv:authTag:ciphertext structure');

    const decrypted = decryptData(encrypted);
    assert.strictEqual(decrypted, rawSoapNotes);
  });

  it('should generate verifiable HMAC-SHA256 digital signatures', () => {
    const canonicalPrescription = 'consultation-101|doctor-202|patient-303|Amlapitta|1700000000';
    const signature = generateHmacSignature(canonicalPrescription);

    assert.strictEqual(typeof signature, 'string');
    assert.strictEqual(signature.length, 64);

    const isValid = verifyHmacSignature(canonicalPrescription, signature);
    assert.strictEqual(isValid, true);

    const isTamperedValid = verifyHmacSignature(canonicalPrescription + '_tampered', signature);
    assert.strictEqual(isTamperedValid, false);
  });

  it('should compute deterministic SHA-256 hashes', () => {
    const hash1 = computeSha256('Amrutam');
    const hash2 = computeSha256('Amrutam');
    assert.strictEqual(hash1, hash2);
  });
});
