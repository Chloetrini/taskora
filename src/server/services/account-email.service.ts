import 'server-only'
import type { Types } from 'mongoose'
import User from '@/server/models/user.model'
import { siteUrl } from '@/lib/site-url'
import { createToken, RESET_TOKEN_TTL_MS, VERIFY_TOKEN_TTL_MS } from '@/server/lib/tokens'
import { describeError } from '@/server/lib/http'
import { sendEmail } from './email.service'
import { passwordResetEmail, verificationEmail } from './email-templates'

type Recipient = { _id: Types.ObjectId; fullName: string }

/*
 * Both helpers store a fresh token (replacing any older one, so only the newest
 * link works), email it, and report whether it went out. They never throw:
 * a provider hiccup must not turn into a 500 or reveal whether an account exists.
 * Links use siteUrl() — never the request's Host header, which an attacker controls.
 */

/** `to` is the address being confirmed: the new one when someone is changing their email. */
export async function issueVerificationEmail(user: Recipient, to: string): Promise<boolean> {
  const { token, hash } = createToken()
  await User.updateOne(
    { _id: user._id },
    { $set: { verifyTokenHash: hash, verifyTokenExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) } }
  )
  try {
    await sendEmail({ to, ...verificationEmail({ fullName: user.fullName, url: `${siteUrl()}/verify-email?token=${token}` }) })
    return true
  } catch (error) {
    console.error('[email] Could not send the verification email:', describeError(error))
    return false
  }
}

export async function issuePasswordResetEmail(user: Recipient, to: string): Promise<boolean> {
  const { token, hash } = createToken()
  await User.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: hash, resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS) } }
  )
  try {
    await sendEmail({ to, ...passwordResetEmail({ fullName: user.fullName, url: `${siteUrl()}/reset-password?token=${token}` }) })
    return true
  } catch (error) {
    console.error('[email] Could not send the password reset email:', describeError(error))
    return false
  }
}
