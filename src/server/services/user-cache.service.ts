import 'server-only'
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto'
import { env } from '@/server/config/env'
import User from '@/server/models/user.model'
import { cacheConfigured, cacheEnabled, cachePrefix, DEFAULT_TTL, getCache, setCache } from './cache.service'

/*
 * Caching a user's private tasks in a third-party memcached. Eventra caches
 * public pages by URL; that would leak here, so this layer adds what tenant
 * data needs:
 *
 *  1. Keys start with the userId from the SESSION (callers pass it from
 *     requireUser), so one person's entries can never answer another's request.
 *     Authentication itself is never cached: requireUser still checks the user
 *     and session version against MongoDB on every request.
 *  2. Values are ENCRYPTED (AES-256-GCM, key derived from SESSION_SECRET) before
 *     they leave the server, and the key is bound in as authenticated data.
 *     MemCachier sees only ciphertext, a tampered value is a miss, and a value
 *     copied under another user's key can't be opened.
 *  3. Invalidation uses a version counter that lives in MONGODB, on the user
 *     (`dataVersion`), not in the cache. requireUser already loads the user on
 *     every request, so the current version costs nothing to read, and every
 *     write to the user's tasks increments it. Each cache key embeds the
 *     version, so after a write every older copy is unreachable at once.
 *     Because the counter is in the database, this holds even if the cache was
 *     down, slow or evicting when the write happened (memcached has no
 *     delete-by-pattern, and a counter kept in it could be lost or reset).
 */

let sealing: { secret: string; key: Buffer } | null = null
const sealingKey = (): Buffer => {
  const secret = env().SESSION_SECRET
  if (sealing?.secret !== secret) {
    sealing = { secret, key: Buffer.from(hkdfSync('sha256', secret, 'taskora-cache', 'value-encryption-v1', 32)) }
  }
  return sealing.key
}

/** iv (12) + auth tag (16) + ciphertext, base64. `aad` (the cache key) is authenticated but not stored. */
function seal(plain: string, aad: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', sealingKey(), iv)
  cipher.setAAD(Buffer.from(aad))
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')
}

/** Returns null for anything that isn't a value WE sealed for THIS key (tampered, wrong key, old secret). */
function open(sealed: string, aad: string): string | null {
  try {
    const raw = Buffer.from(sealed, 'base64')
    if (raw.length < 29) return null
    const decipher = createDecipheriv('aes-256-gcm', sealingKey(), raw.subarray(0, 12))
    decipher.setAAD(Buffer.from(aad))
    decipher.setAuthTag(raw.subarray(12, 28))
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

export type CacheStatus = 'HIT' | 'MISS' | null

/**
 * Read-through cache for one user's data. `dataVersion` is `user.dataVersion`
 * from requireUser; `params` identifies the query (filters etc.); `load` runs
 * on a miss. `cache` is what to report in the x-cache header: null when
 * caching is off or paused.
 */
export async function cachedForUser<T>(
  userId: string,
  dataVersion: number | undefined,
  scope: string,
  params: unknown,
  load: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<{ value: T; cache: CacheStatus }> {
  if (!cacheEnabled()) return { value: await load(), cache: null }

  // Hashed: query strings (search text) can be long, and memcached keys max out at 250 bytes.
  const digest = createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 32)
  const key = `${cachePrefix()}:u:${userId}:v${dataVersion ?? 0}:${scope}:${digest}`

  const sealed = await getCache(key)
  if (sealed !== null) {
    const text = open(sealed, key)
    if (text !== null) {
      try {
        return { value: JSON.parse(text) as T, cache: 'HIT' }
      } catch {
        // fall through to a fresh read
      }
    }
  }

  const value = await load()
  // Awaited on purpose: on serverless the function can be frozen the moment the response is sent.
  await setCache(key, seal(JSON.stringify(value), key), ttl)
  return { value, cache: cacheEnabled() ? 'MISS' : null }
}

/**
 * Call AFTER every write to the user's tasks has succeeded. Requests that
 * begin after this read the new version and so never see older cached copies.
 * A no-op when MemCachier isn't configured (nothing cached, nothing to
 * invalidate); when it IS configured this always runs, even if the cache is
 * unreachable right now, because it only touches MongoDB.
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  if (!cacheConfigured()) return
  await User.updateOne({ _id: userId }, { $inc: { dataVersion: 1 } })
}

/** Adds the x-cache header (like Eventra's cache middleware) when caching is on. */
export function withCacheHeader<R extends { headers: Headers }>(res: R, cache: CacheStatus): R {
  if (cache) res.headers.set('x-cache', cache)
  return res
}
