// src/lib/rateLimiter.ts
// Simple in-memory rate limiter untuk API routes

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '100');
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes

export function getRateLimitKey(identifier: string, endpoint: string): string {
  return `${identifier}:${endpoint}`;
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) {
    // First request
    rateLimitStore.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }

  if (now > record.resetTime) {
    // Window expired, reset
    rateLimitStore.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }

  record.count++;
  return record.count > REQUESTS;
}

export function getRateLimitInfo(key: string): {
  remaining: number;
  limit: number;
  resetTime: number;
} {
  const record = rateLimitStore.get(key);
  const now = Date.now();

  if (!record) {
    return { remaining: REQUESTS, limit: REQUESTS, resetTime: now + WINDOW_MS };
  }

  if (now > record.resetTime) {
    return { remaining: REQUESTS, limit: REQUESTS, resetTime: now + WINDOW_MS };
  }

  return {
    remaining: Math.max(0, REQUESTS - record.count),
    limit: REQUESTS,
    resetTime: record.resetTime,
  };
}

// Cleanup old records setiap 1 jam
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);
