import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from the configured ENCRYPTION_MASTER_KEY.
 */
function getMasterKey(): Buffer {
  return crypto.scryptSync(env.ENCRYPTION_MASTER_KEY, 'amrutam_salt_2026', 32);
}

/**
 * Encrypts sensitive health records (SOAP notes, diagnoses) using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (hex encoded)
 */
export function encryptData(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted strings.
 */
export function decryptData(payload: string): string {
  if (!payload || !payload.includes(':')) return payload;
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload structure. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);

  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Computes a standard SHA-256 hex digest.
 */
export function computeSha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes an HMAC-SHA256 signature for prescriptions or webhook validation.
 */
export function generateHmacSignature(data: string, secret: string = env.AUDIT_HMAC_SECRET): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verifies an HMAC-SHA256 signature in constant-time to prevent timing attacks.
 */
export function verifyHmacSignature(data: string, signature: string, secret: string = env.AUDIT_HMAC_SECRET): boolean {
  const expected = generateHmacSignature(data, secret);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

/**
 * Computes a cryptographically chained audit hash for tamper-evident healthcare audit logs.
 */
export function computeAuditHash(
  action: string,
  resource: string,
  resourceId: string,
  userId: string,
  timestamp: string,
  previousHash: string,
  secret: string = env.AUDIT_HMAC_SECRET
): string {
  const canonicalPayload = `${previousHash}|${timestamp}|${userId}|${action}|${resource}|${resourceId}`;
  return crypto.createHmac('sha256', secret).update(canonicalPayload).digest('hex');
}
