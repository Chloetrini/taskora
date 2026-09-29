import 'server-only'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import User from '@/server/models/user.model'
import { HttpError, ok, parseBody } from '@/server/lib/http'
import { clientIp, LIMITS, rateLimit } from '@/server/lib/rate-limit'
import { hashToken, isExpired } from '@/server/lib/tokens'
import { assertEmailReady } from '@/server/services/email.service'
import { issuePasswordResetEmail, issueVerificationEmail } from '@/server/services/account-email.service'
import { forgotPasswordBody, resendVerificationBody, resetPasswordBody, verifyEmailBody } from '@/lib/validation'
import { BCRYPT_COST } from './auth.controller'

const INVALID_LINK = 'This link is invalid or has expired. Request a new one.'
const invalidLink = () => new HttpError(400, INVALID_LINK, undefined, false, 'invalid_token')

/**
 * POST /auth/verify-email — confirms an address from the emailed token. The
 * token is single-use (cleared here) and expires. Handles both cases:
 * a new account confirming its address, and someone confirming a NEW address
 * (`pendingEmail`), which only replaces `email` at this moment.
 * It's a POST on purpose: mail scanners that pre-fetch links would use up a GET.
 */
export async function verifyEmail(req: NextRequest) {
  rateLimit(`token:${clientIp(req)}`, LIMITS.token.limit, LIMITS.token.windowMs)
  const { token } = await parseBody(req, verifyEmailBody)
  const hash = hashToken(token)

  const user = await User.findOne({ verifyTokenHash: hash }).select('+verifyTokenHash +verifyTokenExpires').lean()
  if (!user || isExpired(user.verifyTokenExpires)) throw invalidLink()

  const changes: Record<string, unknown> = { emailVerified: true, verifyTokenHash: null, verifyTokenExpires: null }
  if (user.pendingEmail) {
    if (await User.exists({ email: user.pendingEmail, _id: { $ne: user._id } })) {
      throw new HttpError(409, 'That email now belongs to another account.', undefined, false, 'email_taken')
    }
    changes.email = user.pendingEmail
    changes.pendingEmail = null
  }
  // Conditional on the hash still being there: a second request with the same link finds nothing.
  const { modifiedCount } = await User.updateOne({ _id: user._id, verifyTokenHash: hash }, { $set: changes })
  if (!modifiedCount) throw invalidLink()

  return ok('Email verified', { email: (changes.email as string | undefined) ?? user.email })
}

/**
 * POST /auth/resend-verification — sends a fresh link (the old one stops working).
 * Always answers the same way, so it can't be used to find out who has an account.
 */
export async function resendVerification(req: NextRequest) {
  rateLimit(`email:${clientIp(req)}`, LIMITS.email.limit, LIMITS.email.windowMs)
  const { identifier } = await parseBody(req, resendVerificationBody)
  rateLimit(`email-to:${identifier}`, LIMITS.emailTo.limit, LIMITS.emailTo.windowMs)
  assertEmailReady()

  const field = identifier.includes('@') ? 'email' : 'username'
  const user = await User.findOne({ [field]: identifier }).lean()
  if (user?.pendingEmail) await issueVerificationEmail(user, user.pendingEmail)
  else if (user && user.emailVerified === false) await issueVerificationEmail(user, user.email)

  return ok('If that account still needs verifying, we’ve sent a new link.')
}

/** POST /auth/forgot-password — emails a 30-minute, single-use reset link. Same answer whether or not the account exists. */
export async function forgotPassword(req: NextRequest) {
  rateLimit(`email:${clientIp(req)}`, LIMITS.email.limit, LIMITS.email.windowMs)
  const { email } = await parseBody(req, forgotPasswordBody)
  rateLimit(`email-to:${email}`, LIMITS.emailTo.limit, LIMITS.emailTo.windowMs)
  assertEmailReady()

  const user = await User.findOne({ email }).lean()
  if (user) await issuePasswordResetEmail(user, user.email)

  return ok('If an account uses that email, we’ve sent a link to reset the password.')
}

/**
 * POST /auth/reset-password — sets a new password from the emailed token.
 * The password is validated before the token is looked at, so a weak one
 * doesn't use up the link. Success signs out every device (session version
 * bump) and doesn't sign this one in: they log in with the new password.
 * Receiving the email also proves the address, so it counts as verified.
 */
export async function resetPassword(req: NextRequest) {
  rateLimit(`token:${clientIp(req)}`, LIMITS.token.limit, LIMITS.token.windowMs)
  const { token, newPassword } = await parseBody(req, resetPasswordBody)
  const hash = hashToken(token)

  const user = await User.findOne({ resetTokenHash: hash }).select('+resetTokenHash +resetTokenExpires +sessionVersion').lean()
  if (!user || isExpired(user.resetTokenExpires)) throw invalidLink()

  const { modifiedCount } = await User.updateOne(
    { _id: user._id, resetTokenHash: hash },
    {
      $set: {
        password: await bcrypt.hash(newPassword, BCRYPT_COST),
        hasPassword: true,
        emailVerified: true,
        sessionVersion: (user.sessionVersion ?? 0) + 1,
        resetTokenHash: null,
        resetTokenExpires: null,
        // A half-finished email change could have been started by someone who
        // had access; the reset ends that too.
        pendingEmail: null,
        verifyTokenHash: null,
        verifyTokenExpires: null,
      },
    }
  )
  if (!modifiedCount) throw invalidLink()

  return ok('Password reset. Log in with your new password.')
}
