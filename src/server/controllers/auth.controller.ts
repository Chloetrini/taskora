import 'server-only'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import User from '@/server/models/user.model'
import { addUsernameToFilter, isUsernameTaken } from '@/server/services/username-bloom.service'
import { fieldError, HttpError, ok, parseBody } from '@/server/lib/http'
import { clearSessionCookie, setSessionCookie } from '@/server/lib/session'
import { requireUser, toPublicUser } from '@/server/lib/auth'
import { assertEmailReady } from '@/server/services/email.service'
import { issueVerificationEmail } from '@/server/services/account-email.service'
import { clientIp, LIMITS, rateLimit } from '@/server/lib/rate-limit'
import { loginBody, registerBody } from '@/lib/validation'

export const BCRYPT_COST = 12

// Compared against when no user matches, so a failed login takes the same
// time either way — response timing can't reveal which emails exist.
let dummyHash: string | null = null
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password', BCRYPT_COST))

/**
 * Creates the account but does NOT sign anyone in: the address has to be
 * confirmed from the emailed link first (see verifyEmail). If the email
 * couldn't be sent, the account still exists and `verificationSent` is false,
 * so the page can offer "Resend".
 */
export async function register(req: NextRequest) {
  rateLimit(`auth:${clientIp(req)}`, LIMITS.auth.limit, LIMITS.auth.windowMs)
  const { fullName, username, email, password } = await parseBody(req, registerBody)
  assertEmailReady() // production without an email provider: fail before creating anything

  if (await isUsernameTaken(username)) throw fieldError(409, 'username', 'That username is taken')
  if (await User.exists({ email })) throw fieldError(409, 'email', 'An account with this email already exists')

  const user = await User.create({
    fullName,
    username,
    email,
    password: await bcrypt.hash(password, BCRYPT_COST),
    hasPassword: true,
    emailVerified: false,
  })
  addUsernameToFilter(username)

  const verificationSent = await issueVerificationEmail({ _id: user._id, fullName }, email)
  return ok('Account created. Check your email to verify it.', { email, verificationSent }, 201)
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
  // Only said AFTER the password checked out, so this never reveals which emails have accounts.
  // Accounts from before verification existed have no flag and count as verified.
  if (user.emailVerified === false) {
    throw new HttpError(403, 'Verify your email to log in. Check your inbox for the link we sent.', undefined, false, 'email_not_verified')
  }

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
