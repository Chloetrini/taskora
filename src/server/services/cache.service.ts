import 'server-only'
import { Client as Memcached } from 'memjs'
import { memcachierEnv } from '@/server/config/env'

/*
 * Same shape as Eventra's cache.service: a lazy memjs client, MemCachier's SASL
 * login, short timeouts, and calls that NEVER throw. A cache that is down, slow
 * or full must never break a request: a miss just means reading MongoDB.
 * Tenant-safe use of it lives in user-cache.service.ts; don't cache private
 * data through these primitives directly.
 */

const CACHE_PREFIX = 'tk:v1' // bump the version to abandon every old entry at once
export const DEFAULT_TTL = 60 // seconds

export const cachePrefix = () => CACHE_PREFIX

// One client per server instance, kept across warm serverless invocations.
// Rebuilt if the environment changes (tests do that).
let current: { signature: string; client: Memcached | null } | null = null

// Circuit breaker: after a failure, skip the cache for a while. Without it, a
// cache that accepts connections but never answers would add its timeout to
// every request. Only the first request after a failure pays for it.
const BACKOFF_MS = 30_000
let pausedUntil = 0
const failed = (what: string, error: unknown) => {
  if (Date.now() >= pausedUntil) console.warn(`[cache] ${what} failed; skipping the cache for ${BACKOFF_MS / 1000}s:`, (error as Error).message)
  pausedUntil = Date.now() + BACKOFF_MS
}
/** Test helper: forget a previous failure. */
export const resetCacheBackoff = () => {
  pausedUntil = 0
}

const getClient = (): Memcached | null => {
  if (Date.now() < pausedUntil) return null
  const config = memcachierEnv()
  const signature = config ? `${config.servers}|${config.username ?? ''}|${config.password ?? ''}` : ''
  if (current?.signature === signature) return current.client

  let client: Memcached | null = null
  if (config) {
    const options: Record<string, unknown> = { timeout: 1, retries: 1, failover: false }
    // SASL authentication for MemCachier
    if (config.username && config.password) {
      options.username = config.username
      options.password = config.password
    }
    client = Memcached.create(config.servers, options)
    console.info('[cache] Memcached client initialised')
  }
  current = { signature, client }
  return client
}

/** Is MemCachier set up at all (even if it is unreachable at this moment)? */
export const cacheConfigured = (): boolean => memcachierEnv() !== null

/** Is the cache usable right now (configured, and not paused after a failure)? When false, every function below is a no-op. */
export const cacheEnabled = (): boolean => getClient() !== null

/** Returns `null` on a miss, an error, or when the cache is off. */
export const getCache = async (key: string): Promise<string | null> => {
  const client = getClient()
  if (!client) return null
  try {
    const result = await client.get(key)
    return result.value ? result.value.toString() : null
  } catch (error) {
    failed('GET', error)
    return null
  }
}

/** Stores a value for `ttl` seconds. Returns whether it was stored. */
export const setCache = async (key: string, value: string, ttl: number = DEFAULT_TTL): Promise<boolean> => {
  const client = getClient()
  if (!client) return false
  try {
    return await client.set(key, value, { expires: ttl })
  } catch (error) {
    failed('SET', error)
    return false
  }
}

export const deleteCache = async (key: string): Promise<boolean> => {
  const client = getClient()
  if (!client) return false
  try {
    return await client.delete(key)
  } catch (error) {
    failed('DELETE', error)
    return false
  }
}

/** Empties the whole cache. Use sparingly (a version bump, or a suspected bad deploy). */
export const flushCache = async (): Promise<boolean> => {
  const client = getClient()
  if (!client) return false
  try {
    await client.flush()
    console.info('[cache] Cache flushed')
    return true
  } catch (error) {
    failed('FLUSH', error)
    return false
  }
}
