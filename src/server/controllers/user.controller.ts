import 'server-only'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import User from '@/server/models/user.model'
import Todo from '@/server/models/todo.model'
import { addUsernameToFilter, isUsernameTaken } from '@/server/services/username-bloom.service'
import { fieldError, HttpError, ok, parseBody, parseQuery } from '@/server/lib/http'
import { clearSessionCookie, readSession, setSessionCookie } from '@/server/lib/session'
import { requireUser, toPublicUser } from '@/server/lib/auth'
import { assertEmailReady } from '@/server/services/email.service'
import { issueVerificationEmail } from '@/server/services/account-email.service'
import { invalidateUserCache } from '@/server/services/user-cache.service'
import { clientIp, LIMITS, rateLimit } from '@/server/lib/rate-limit'
import { changePasswordBody, deleteAccountBody, updateProfileBody, usernameField, usernameQuery } from '@/lib/validation'
import { BCRYPT_COST } from './auth.controller'

type Availability = { available: boolean; reason?: string }

/**
 * Live "is this username free?" for the register and profile forms.
 * Invalid usernames come back as unavailable with the reason, so the form
 * shows one message instead of two. Your own username counts as available.
 */
export async function checkUsername(req: NextRequest) {
  rateLimit(`username:${clientIp(req)}`, LIMITS.usernameCheck.limit, LIMITS.usernameCheck.windowMs)
  const { username } = parseQuery(req, usernameQuery)

  const parsed = usernameField.safeParse(username)
  if (!parsed.success) {
    return ok<Availability>('Username checked', { available: false, reason: parsed.error.issues[0]?.message ?? 'Invalid username' })
  }

  const session = await readSession(req)
  const taken = await isUsernameTaken(parsed.data, session?.uid)
  return ok<Availability>('Username checked', taken ? { available: false, reason: 'That username is taken' } : { available: true })
}

export async function updateProfile(req: NextRequest) {
  const { userId, user: current } = await requireUser(req)
  const { email, ...rest } = await parseBody(req, updateProfileBody)

  if (rest.username && (await isUsernameTaken(rest.username, userId))) throw fieldError(409, 'username', 'That username is taken')

  // A new email is NOT applied yet: it waits in `pendingEmail` until its owner
  // opens the link we send there. Otherwise anyone could put someone else's
  // address on their account (and log in as that person via Google).
  const set: Record<string, unknown> = { ...rest }
  let confirmTo: string | null = null
  if (email !== undefined) {
    if (email === current.email) {
      set.pendingEmail = null // typed the current address back: cancels a pending change
    } else {
      if (await User.exists({ email, _id: { $ne: userId } })) throw fieldError(409, 'email', 'An account with this email already exists')
      assertEmailReady()
      set.pendingEmail = email
      confirmTo = email
    }
  }

  const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true, runValidators: true }).select('+googleId +password').lean()
  if (!user) throw new HttpError(404, 'Account not found')
  if (rest.username) addUsernameToFilter(rest.username)

  if (!confirmTo) return ok('Profile updated', toPublicUser(user))
  const sent = await issueVerificationEmail({ _id: user._id, fullName: user.fullName }, confirmTo)
  return ok(
    sent
      ? `Profile updated. We sent a link to ${confirmTo}; your email changes once you open it.`
      : 'Profile updated, but we couldn’t send the confirmation email. Use “Resend” to try again.',
    toPublicUser(user)
  )
}

export async function changePassword(req: NextRequest) {
  rateLimit(`auth:${clientIp(req)}`, LIMITS.auth.limit, LIMITS.auth.windowMs)
  const { userId } = await requireUser(req)
  const { currentPassword, newPassword } = await parseBody(req, changePasswordBody)

  const user = await User.findById(userId).select('+password +sessionVersion').lean()
  if (!user) throw new HttpError(404, 'Account not found')
  // Google-only accounts are SETTING a first password, so there's nothing to check.
  if (user.password) {
    if (!currentPassword) throw fieldError(400, 'currentPassword', 'Enter your current password')
    if (!(await bcrypt.compare(currentPassword, user.password))) throw fieldError(400, 'currentPassword', 'Current password is incorrect')
  }

  // Bumping the version signs out every other device; this one gets a fresh cookie.
  const nextVersion = (user.sessionVersion ?? 0) + 1
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        password: await bcrypt.hash(newPassword, BCRYPT_COST),
        hasPassword: true,
        sessionVersion: nextVersion,
        // An unused "forgot password" link must not outlive a password change.
        resetTokenHash: null,
        resetTokenExpires: null,
      },
    }
  )

  const res = ok(user.password ? 'Password changed' : 'Password set')
  await setSessionCookie(res, { uid: userId, v: nextVersion })
  return res
}

export async function deleteAccount(req: NextRequest) {
  rateLimit(`auth:${clientIp(req)}`, LIMITS.auth.limit, LIMITS.auth.windowMs)
  const { userId } = await requireUser(req)
  const { password, confirmUsername } = await parseBody(req, deleteAccountBody)

  const user = await User.findById(userId).select('+password').lean()
  if (!user) throw new HttpError(404, 'Account not found')
  // Password accounts confirm with the password; Google-only accounts type their username.
  if (user.password) {
    if (!password || !(await bcrypt.compare(password, user.password))) throw fieldError(400, 'password', 'Password is incorrect')
  } else if (confirmUsername?.trim().toLowerCase() !== user.username) {
    throw fieldError(400, 'confirmUsername', 'Type your username exactly to confirm')
  }

  await Todo.deleteMany({ userId })
  await User.deleteOne({ _id: userId })
  await invalidateUserCache(userId)

  const res = ok('Account deleted')
  clearSessionCookie(res)
  return res
}
