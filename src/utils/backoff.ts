/**
 * Calculates exponential backoff with Full Jitter according to AWS Architecture recommendations.
 * Formula: Sleep = rand(0, min(cap, base * 2 ** attempt))
 */
export function calculateFullJitterBackoff(
  attempt: number,
  baseMs = 100,
  maxCapMs = 5000
): number {
  const exponential = Math.min(maxCapMs, baseMs * Math.pow(2, attempt));
  return Math.floor(Math.random() * exponential);
}

/**
 * Retries an asynchronous function using exponential backoff with full jitter.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseMs = 100,
  maxCapMs = 2000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }
      const delay = calculateFullJitterBackoff(attempt, baseMs, maxCapMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
