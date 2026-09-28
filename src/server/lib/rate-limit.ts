import 'server-only'
import type { NextRequest } from 'next/server'
import { HttpError } from './http'

/*
 * In-memory fixed-window limiter. On Vercel each warm instance has its own
 * memory, so this is best-effort (it stops a single burst, not a determined
 * distributed attacker). Swap for Upstash/Redis if that ever matters.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

export function rateLimit(key: string, limit: number, windowMs: number): void {
  if (process.env.DISABLE_RATE_LIMIT === '1') return
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    }
    return
  }
  bucket.count++
  if (bucket.count > limit) {
    const retryIn = Math.ceil((bucket.resetAt - now) / 60000)
    throw new HttpError(429, `Too many attempts. Try again in ${retryIn} minute${retryIn === 1 ? '' : 's'}.`)
  }
}

export const LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60 * 1000 }, // login / register / password / delete
  createTask: { limit: 30, windowMs: 60 * 1000 },
  usernameCheck: { limit: 120, windowMs: 60 * 1000 },
  avatar: { limit: 20, windowMs: 15 * 60 * 1000 }, // upload / remove profile photo, per user
} as const

/** Test-only. */
export const resetRateLimits = () => buckets.clear()
