// Best-effort in-memory rate limiter for a single Deno isolate.
// Keys are usually `${fn}:${ip}`. Not distributed — protects against
// simple brute-force from a single client hitting a warm instance.

type Bucket = { count: number; resetAt: number; blockedUntil?: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  key: string;
  max: number;         // max attempts within window
  windowMs: number;    // rolling window size
  blockMs?: number;    // additional cool-down after tripping the limit
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
}

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let b = buckets.get(opts.key);

  if (b?.blockedUntil && b.blockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((b.blockedUntil - now) / 1000), remaining: 0 };
  }
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(opts.key, b);
  }

  b.count += 1;
  if (b.count > opts.max) {
    const cool = opts.blockMs ?? opts.windowMs;
    b.blockedUntil = now + cool;
    return { ok: false, retryAfterSec: Math.ceil(cool / 1000), remaining: 0 };
  }
  return { ok: true, retryAfterSec: 0, remaining: Math.max(0, opts.max - b.count) };
}

export function clientKey(req: Request, fn: string): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "anon";
  return `${fn}:${ip}`;
}

// Cleanup old buckets occasionally to avoid unbounded growth.
let lastCleanup = 0;
export function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [k, v] of buckets) {
    if ((v.blockedUntil ?? v.resetAt) < now) buckets.delete(k);
  }
}