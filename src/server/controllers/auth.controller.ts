import 'server-only'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import User from '@/server/models/user.model'
import { addUsernameToFilter, isUsernameTaken } from '@/server/services/username-bloom.service'
import { fieldError, HttpError, ok, parseBody } from '@/server/lib/http'
import { clearSessionCookie, setSessionCookie } from '@/server/lib/session'
import { requireUser, toPublicUser } from '@/server/lib/auth'
import { clientIp, LIMITS, rateLimit } from '@/server/lib/rate-limit'
import { loginBody, registerBody } from '@/lib/validation'

export const BCRYPT_COST = 12

// Compared against when no user matches, so a failed login takes the same
// time either way — response timing can't reveal which emails exist.
let dummyHash: string | null = null
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password', BCRYPT_COST))

export async function register(req: NextRequest) {
  rateLimit(`auth:${clientIp(req)}`, LIMITS.auth.limit, LIMITS.auth.windowMs)
  const { fullName, username, email, password } = await parseBody(req, registerBody)

  if (await isUsernameTaken(username)) throw fieldError(409, 'username', 'That username is taken')
  if (await User.exists({ email })) throw fieldError(409, 'email', 'An account with this email already exists')

  const user = await User.create({ fullName, username, email, password: await bcrypt.hash(password, BCRYPT_COST), hasPassword: true })
  addUsernameToFilter(username)

  const res = ok('Account created', toPublicUser(user.toObject()), 201)
  await setSessionCookie(res, { uid: String(user._id), v: 0 })
  return res
}

export async function login(req: NextRequest) {
  rateLimit(`auth:${clientIp(req)}`, LIMITS.auth.limit, LIMITS.auth.windowMs)
  const { identifier, password } = await parseBody(req, loginBody)

  const field = identifier.includes('@') ? 'email' : 'username'
  const user = await User.findOne({ [field]: identifier }).select('+password +sessionVersion +googleId').lean()

  // Google-only accounts have no password: they compare against the dummy
  // hash and fail like any wrong password (same message, same timing).
  const valid = await bcrypt.compare(password, user?.password ?? getDummyHash())
  // One message for "no such user" and "wrong password".
  if (!user || !user.password || !valid) throw new HttpError(401, 'Email/username or password is incorrect')

  const res = ok('Logged in', toPublicUser(user))
  await setSessionCookie(res, { uid: String(user._id), v: user.sessionVersion ?? 0 })
  return res
}

export async function logout() {
  const res = ok('Logged out')
  clearSessionCookie(res)
  return res
}

export async function me(req: NextRequest) {
  const { user } = await requireUser(req)
  return ok('Current user', toPublicUser(user))
}
