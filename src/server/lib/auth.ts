import 'server-only'
import type { NextRequest } from 'next/server'
import User from '@/server/models/user.model'
import { HttpError } from './http'
import { readSession } from './session'

/**
 * Resolves the signed-in user or throws 401 — and asks the route wrapper to
 * clear the cookie, so a stale cookie (deleted account, password changed on
 * another device) can never cause a redirect loop with proxy.ts.
 */
export async function requireUser(req: NextRequest) {
  const session = await readSession(req)
  if (!session) throw new HttpError(401, 'Please log in to continue', undefined, true)

  const user = await User.findById(session.uid).select('+sessionVersion +googleId +password').lean()
  if (!user || (user.sessionVersion ?? 0) !== session.v) {
    throw new HttpError(401, 'Your session has ended. Please log in again.', undefined, true)
  }
  return { user, userId: String(user._id) }
}

/**
 * The public shape of a user — never password, sessionVersion, googleId,
 * avatar bytes or __v. Adds `googleLinked` so the profile can show "Google
 * connected", and `avatarUrl` (versioned, so a new photo busts the cache).
 * Callers must select '+googleId' for googleLinked to be accurate, and
 * '+password' when they can: `hasPassword` then comes from the password
 * itself, which also covers accounts created before the flag existed.
 */
export function toPublicUser(user: object) {
  const { password, sessionVersion: _v, __v: _x, googleId, avatar: _a, avatarUpdatedAt, ...safe } = user as Record<string, unknown>
  const hasPassword = password === undefined ? Boolean(safe.hasPassword) : Boolean(password)
  const avatarUrl = avatarUpdatedAt ? `/api/v1/users/me/avatar?v=${new Date(avatarUpdatedAt as Date).getTime()}` : null
  return { ...safe, hasPassword, googleLinked: Boolean(googleId), avatarUrl }
}
