import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // email verification links last a day
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000 // password reset links last 30 minutes

/** Only the hash is stored, so a leaked database can't be used to reset anyone's password. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** 256 random bits, URL-safe. `token` goes in the email; `hash` goes in the database. */
export function createToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export const isExpired = (expires?: Date | null) => !expires || new Date(expires).getTime() < Date.now()
