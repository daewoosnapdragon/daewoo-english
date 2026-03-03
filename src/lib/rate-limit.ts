/**
 * Simple in-memory sliding-window rate limiter.
 *
 * For production with multiple server instances, replace with
 * Redis-backed limiter (e.g. @upstash/ratelimit).
 */

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  max: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface TokenBucket {
  timestamps: number[];
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max } = options;
  const buckets = new Map<string, TokenBucket>();

  // Periodically clean up expired entries to prevent memory leak
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);
      if (bucket.timestamps.length === 0) buckets.delete(key);
    }
  }, Math.max(windowMs * 2, 120_000));
  if (typeof cleanup === 'object' && 'unref' in cleanup) cleanup.unref();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { timestamps: [] };
        buckets.set(key, bucket);
      }

      // Remove expired timestamps
      bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);

      if (bucket.timestamps.length >= max) {
        const oldest = bucket.timestamps[0];
        const retryAfterMs = oldest + windowMs - now;
        return { ok: false, remaining: 0, retryAfterMs };
      }

      bucket.timestamps.push(now);
      return { ok: true, remaining: max - bucket.timestamps.length, retryAfterMs: 0 };
    },

    reset(key: string) { buckets.delete(key); },
    resetAll() { buckets.clear(); },
  };
}

// Pre-configured limiters
export const aiLimiter = rateLimit({ windowMs: 60_000, max: 10 });   // 10 AI calls/min
export const authLimiter = rateLimit({ windowMs: 60_000, max: 5 });  // 5 auth attempts/min
export const uploadLimiter = rateLimit({ windowMs: 60_000, max: 20 }); // 20 uploads/min
