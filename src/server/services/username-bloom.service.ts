import 'server-only'
import User from '@/server/models/user.model'

/**
 * Bloom filter for "is this username taken?".
 *
 * A bloom filter can say "definitely NOT in the set" with certainty, or
 * "PROBABLY in the set" (with a small false-positive rate). So:
 *   - not in filter  → available, answered with zero DB queries
 *   - maybe in filter → confirm with a real DB lookup
 * It never gives a false "available", so it's safe as a first check. The
 * unique index on User.username is still the final authority on save.
 */
export class BloomFilter {
  private readonly bits: Uint8Array
  readonly size: number
  readonly hashCount: number

  /** Sized for `expectedItems` at the target false-positive rate. */
  constructor(expectedItems: number, falsePositiveRate = 0.01) {
    const n = Math.max(1, expectedItems)
    this.size = Math.ceil((-n * Math.log(falsePositiveRate)) / Math.LN2 ** 2)
    this.hashCount = Math.max(1, Math.round((this.size / n) * Math.LN2))
    this.bits = new Uint8Array(Math.ceil(this.size / 8))
  }

  // Two independent 32-bit FNV-1a hashes, combined (Kirsch–Mitzenmacher
  // double hashing) to derive `hashCount` bit positions.
  private hashes(value: string): number[] {
    let h1 = 0x811c9dc5
    let h2 = 0x01000193 ^ 0x5bd1e995
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i)
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
      h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0
      // `^` returns a SIGNED 32-bit int — `>>> 0` keeps it unsigned. Without
      // it, positions could go negative, Uint8Array silently ignores the
      // write, and the filter gives false "available" answers.
      h2 = (h2 ^ (h2 >>> 13)) >>> 0
    }
    const step = (h2 | 1) >>> 0
    const positions: number[] = []
    for (let i = 0; i < this.hashCount; i++) {
      positions.push((h1 + i * step) % this.size)
    }
    return positions
  }

  add(value: string): void {
    for (const pos of this.hashes(value)) this.bits[pos >> 3] |= 1 << (pos & 7)
  }

  mightContain(value: string): boolean {
    return this.hashes(value).every(pos => (this.bits[pos >> 3] & (1 << (pos & 7))) !== 0)
  }
}

// Room for growth before the false-positive rate climbs; rebuilt per
// serverless instance on first use, so it self-heals after a cold start.
const CAPACITY = 100_000

let filter: BloomFilter | null = null
let building: Promise<BloomFilter> | null = null

const buildFilter = async (): Promise<BloomFilter> => {
  const next = new BloomFilter(CAPACITY)
  const cursor = User.find({}, { username: 1 }).lean().cursor()
  let count = 0
  for await (const doc of cursor) {
    next.add((doc as { username: string }).username)
    count++
  }
  if (process.env.NODE_ENV !== 'test') console.info(`[bloom] Username filter built from ${count} users`)
  return next
}

const getFilter = async (): Promise<BloomFilter> => {
  if (filter) return filter
  building ??= buildFilter()
    .then(built => (filter = built))
    .finally(() => (building = null))
  return building
}

/** Call after a user is created or renamed. */
export const addUsernameToFilter = (username: string): void => {
  filter?.add(username.toLowerCase())
}

/**
 * Returns whether the username is taken. Removed usernames (renames,
 * deleted accounts) stay in the filter — that's fine, the DB check below
 * turns those "probably taken" into "available".
 */
export const isUsernameTaken = async (username: string, excludeUserId?: string): Promise<boolean> => {
  const normalized = username.toLowerCase()
  const bloom = await getFilter()
  if (!bloom.mightContain(normalized)) return false
  const existing = await User.exists({ username: normalized, ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}) })
  return Boolean(existing)
}

/** Test-only: drop the cached filter so each test starts fresh. */
export const resetUsernameFilter = (): void => {
  filter = null
  building = null
}
