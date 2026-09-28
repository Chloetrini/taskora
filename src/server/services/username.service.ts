import 'server-only'
import { randomInt } from 'crypto'
import { LIMITS, RESERVED_USERNAMES, USERNAME_PATTERN } from '@/constants/todo-values'
import { isUsernameTaken } from './username-bloom.service'

/**
 * Picks a free username for a Google sign-up, from their email or name:
 * "Chloe.Egbukwu@gmail.com" → "chloeegbukwu", or "chloeegbukwu4821" if taken.
 * Availability goes through the bloom filter (+ DB confirm), like every
 * other username check. They can change it later on the profile page.
 */
export async function generateUniqueUsername(email: string, name?: string): Promise<string> {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]/g, '')
  let base = clean(email.split('@')[0] ?? '') || clean(name ?? '') || 'user'
  if (!/^[a-z]/.test(base)) base = `u${base}`
  base = base.slice(0, LIMITS.usernameMax - 5) // leave room for a 4-digit suffix
  if (base.length < LIMITS.usernameMin) base = base.padEnd(LIMITS.usernameMin, '0')

  const isUsable = (u: string) => USERNAME_PATTERN.test(u) && !RESERVED_USERNAMES.includes(u)

  if (isUsable(base) && !(await isUsernameTaken(base))) return base
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${base}${randomInt(1000, 10000)}`
    if (isUsable(candidate) && !(await isUsernameTaken(candidate))) return candidate
  }
  // Practically unreachable; the unique index would still catch a clash.
  return `${base.slice(0, 8)}${Date.now().toString().slice(-8)}`
}
