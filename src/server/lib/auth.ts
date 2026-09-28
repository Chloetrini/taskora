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

  const user = await User.findById(session.uid).select('+sessionVersion +googleId').lean()
  if (!user || (user.sessionVersion ?? 0) !== session.v) {
    throw new HttpError(401, 'Your session has ended. Please log in again.', undefined, true)
  }
  return { user, userId: String(user._id) }
}

/**
 * The public shape of a user — never password, sessionVersion, googleId or
 * __v. Adds `googleLinked` so the profile can show "Signed in with Google".
 * Callers must select '+googleId' for googleLinked to be accurate.
 */
export function toPublicUser(user: object) {
  const { password: _p, sessionVersion: _v, __v: _x, googleId, ...safe } = user as Record<string, unknown>
  return { ...safe, hasPassword: Boolean(safe.hasPassword), googleLinked: Boolean(googleId) }
}
