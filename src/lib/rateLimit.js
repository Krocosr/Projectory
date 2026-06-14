import { NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter for API routes.
 * Not suitable for production multi-instance deployments
 * (use Redis or similar for that).
 */
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

/**
 * Checks if a request should be rate limited.
 */
export function checkRateLimit(key = 'default') {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return {
      limited: false,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  record.count += 1;

  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return { limited: true, remaining: 0, resetTime: record.windowStart + RATE_LIMIT_WINDOW_MS };
  }

  return {
    limited: false,
    remaining: RATE_LIMIT_MAX_REQUESTS - record.count,
    resetTime: record.windowStart + RATE_LIMIT_WINDOW_MS,
  };
}

/**
 * Returns a 429 Response if rate limited, or null if allowed.
 */
export function rateLimitResponse(key = 'default') {
  const status = checkRateLimit(key);
  if (status.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((status.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  return null;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);
