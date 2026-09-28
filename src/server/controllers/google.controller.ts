import 'server-only'
import { createHash, randomBytes } from 'crypto'
import { sealData, unsealData } from 'iron-session'
import { NextResponse, type NextRequest } from 'next/server'
import User from '@/server/models/user.model'
import { env, googleEnv } from '@/server/config/env'
import { connectDB } from '@/server/config/db'
import { describeError } from '@/server/lib/http'
import { setSessionCookie } from '@/server/lib/session'
import { addUsernameToFilter } from '@/server/services/username-bloom.service'
import { generateUniqueUsername } from '@/server/services/username.service'
import { clientIp, LIMITS, rateLimit } from '@/server/lib/rate-limit'

/*
 * "Continue with Google" — OAuth 2.0 authorization-code flow with PKCE, no
 * extra library:
 *   1. GET /api/v1/auth/google            → redirect to Google's consent screen
 *   2. GET /api/v1/auth/google/callback   → exchange the code, read the profile,
 *      find/link/create the user, set our session cookie, redirect into the app.
 * `state` (CSRF protection), the PKCE verifier and the `next` path travel in a
 * short-lived encrypted cookie. Every failure redirects to /login?error=… —
 * never a raw JSON error page.
 */

const OAUTH_COOKIE = 'taskora_oauth'
const OAUTH_TTL = 10 * 60 // 10 minutes to finish signing in
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

type OAuthState = { state: string; verifier: string; next: string }
type GoogleProfile = { sub: string; email?: string; email_verified?: boolean; name?: string }

const base64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')

function appOrigin(req: NextRequest) {
  return googleEnv()?.appUrl || req.nextUrl.origin
}

function redirectUri(req: NextRequest) {
  return `${appOrigin(req)}/api/v1/auth/google/callback`
}

function toLogin(req: NextRequest, error: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${error}`, appOrigin(req)))
  res.cookies.set(OAUTH_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}

async function startGoogleUnsafe(req: NextRequest) {
  const google = googleEnv()
  if (!google) return toLogin(req, 'google_unavailable')
  try {
    rateLimit(`auth:${clientIp(req)}`, LIMITS.auth.limit, LIMITS.auth.windowMs)
  } catch {
    return toLogin(req, 'too_many_attempts')
  }

  const state = base64url(randomBytes(24))
  const verifier = base64url(randomBytes(48))
  const challenge = base64url(createHash('sha256').update(verifier).digest())

  const url = new URL(GOOGLE_AUTH_URL)
  url.search = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()

  const res = NextResponse.redirect(url)
  const sealed = await sealData({ state, verifier, next: safeNext(req.nextUrl.searchParams.get('next')) } satisfies OAuthState, {
    password: env().SESSION_SECRET,
    ttl: OAUTH_TTL,
  })
  // sameSite 'lax' is required: Google sends the user back with a top-level GET.
  res.cookies.set(OAUTH_COOKIE, sealed, { httpOnly: true, secure: env().isProd, sameSite: 'lax', path: '/', maxAge: OAUTH_TTL })
  return res
}

async function googleCallbackUnsafe(req: NextRequest) {
  await connectDB() // only the callback needs the database
  const google = googleEnv()
  if (!google) return toLogin(req, 'google_unavailable')

  const params = req.nextUrl.searchParams
  if (params.get('error')) return toLogin(req, 'google_cancelled') // user pressed Cancel

  // 1. Check state against the cookie (CSRF).
  let saved: Partial<OAuthState> = {}
  try {
    const cookie = req.cookies.get(OAUTH_COOKIE)?.value
    if (cookie) saved = await unsealData<OAuthState>(cookie, { password: env().SESSION_SECRET, ttl: OAUTH_TTL })
  } catch {
    saved = {}
  }
  const code = params.get('code')
  if (!code || !saved.state || !saved.verifier || params.get('state') !== saved.state) return toLogin(req, 'google_failed')

  // 2. Exchange the code for tokens (server to server, with the PKCE verifier).
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: redirectUri(req),
      grant_type: 'authorization_code',
      code_verifier: saved.verifier,
    }),
  })
  if (!tokenRes.ok) return toLogin(req, 'google_failed')
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string }
  if (!accessToken) return toLogin(req, 'google_failed')

  // 3. Read the profile straight from Google over TLS.
  const profileRes = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!profileRes.ok) return toLogin(req, 'google_failed')
  const profile = (await profileRes.json()) as GoogleProfile
  // Only trust verified emails — otherwise anyone could claim someone else's address.
  if (!profile.sub || !profile.email || profile.email_verified !== true) return toLogin(req, 'google_unverified')
  const email = profile.email.toLowerCase()

  // 4. Find by Google id → else link by verified email → else create.
  let user = await User.findOne({ googleId: profile.sub }).select('+sessionVersion').lean()
  if (!user) {
    const byEmail = await User.findOne({ email }).select('+sessionVersion').lean()
    if (byEmail) {
      await User.updateOne({ _id: byEmail._id }, { $set: { googleId: profile.sub } })
      user = byEmail
    } else {
      const username = await generateUniqueUsername(email, profile.name)
      const name = (profile.name?.trim() || email.split('@')[0]).slice(0, 60)
      const fullName = name.length >= 2 ? name : 'Taskora user'
      const created = await User.create({ fullName, username, email, googleId: profile.sub, hasPassword: false })
      addUsernameToFilter(username)
      user = { ...created.toObject(), sessionVersion: 0 }
    }
  }

  const res = NextResponse.redirect(new URL(saved.next ?? '/dashboard', appOrigin(req)))
  res.cookies.set(OAUTH_COOKIE, '', { path: '/', maxAge: 0 })
  await setSessionCookie(res, { uid: String(user._id), v: user.sessionVersion ?? 0 })
  return res
}

/**
 * These two are page navigations, not API calls, so they never return JSON:
 * any unexpected failure logs the real cause and redirects to
 * /login?error=google_failed. In development the cause is logged clearly.
 * They are NOT wrapped in route(), because route() connects to MongoDB first and
 * the start step doesn't need the database.
 */
export async function startGoogle(req: NextRequest) {
  try {
    return await startGoogleUnsafe(req)
  } catch (error) {
    console.error('[google] Could not start sign-in:', describeError(error))
    return toLogin(req, 'google_failed')
  }
}

export async function googleCallback(req: NextRequest) {
  try {
    return await googleCallbackUnsafe(req)
  } catch (error) {
    console.error('[google] Sign-in callback failed:', describeError(error))
    return toLogin(req, 'google_failed')
  }
}
