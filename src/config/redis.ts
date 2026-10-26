import { Redis } from 'ioredis';
import crypto from 'crypto';
import { env } from './env.js';
import { logger } from './logger.js';

let isRedisConnected = false;

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null; // stop reconnecting if unavailable in standalone mode
    return Math.min(times * 100, 1000);
  },
});

redis.on('connect', () => {
  isRedisConnected = true;
  logger.info('Connected to Redis server');
});

redis.on('error', (err) => {
  if (isRedisConnected) {
    logger.warn({ err: err.message }, 'Redis error');
  }
  isRedisConnected = false;
});

// Resilient in-memory fallback for local environments without live Redis
const memoryStore = new Map<string, { value: string; expiresAt: number }>();
const slidingWindowStore = new Map<string, number[]>();

export async function checkRedisHealth(): Promise<boolean> {
  if (!isRedisConnected) return false;
  try {
    const res = await redis.ping();
    return res === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Distributed Lock Acquisition (Redlock style single-instance / cluster NX PX lock)
 * Uses Redis `SET lock:slot:{id} {token} NX PX {ttlMs}` with atomic guarantees.
 */
export async function acquireDistributedLock(
  lockKey: string,
  ttlMs = 10000
): Promise<{ acquired: boolean; token: string }> {
  const token = crypto.randomUUID();

  if (isRedisConnected) {
    try {
      const result = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');
      return { acquired: result === 'OK', token };
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Redis lock error, falling back to memory lock');
    }
  }

  // Memory fallback lock
  const now = Date.now();
  const existing = memoryStore.get(lockKey);
  if (existing && existing.expiresAt > now) {
    return { acquired: false, token };
  }

  memoryStore.set(lockKey, { value: token, expiresAt: now + ttlMs });
  return { acquired: true, token };
}

/**
 * Safe Lua script release: Only deletes the key if value matches the acquired token.
 */
export async function releaseDistributedLock(lockKey: string, token: string): Promise<boolean> {
  if (isRedisConnected) {
    try {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await redis.eval(luaScript, 1, lockKey, token);
      return result === 1;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Redis lock release error');
    }
  }

  // Memory fallback release
  const existing = memoryStore.get(lockKey);
  if (existing && existing.value === token) {
    memoryStore.delete(lockKey);
    return true;
  }
  return false;
}

/**
 * Sliding Window Rate Limiter
 */
export async function checkRateLimit(
  key: string,
  limit = 100,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  let timestamps = slidingWindowStore.get(key) || [];
  timestamps = timestamps.filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    slidingWindowStore.set(key, timestamps);
    return { allowed: false, remaining: 0, resetSeconds };
  }

  timestamps.push(now);
  slidingWindowStore.set(key, timestamps);
  return {
    allowed: true,
    remaining: limit - timestamps.length,
    resetSeconds: windowSeconds,
  };
}
