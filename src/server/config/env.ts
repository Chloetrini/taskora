import 'server-only'
import { SITE } from '@/constants/site'

/**
 * Reads and validates server env vars once. Throws at first use (not at
 * build time) so `next build` works without secrets.
 */
function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key} (see .env.example)`)
  return value
}

let cached: { MONGODB_URI: string; MONGODB_DB: string; SESSION_SECRET: string; isProd: boolean } | null = null

/**
 * Google sign-in is optional: it's on only when both vars are set. APP_URL
 * pins the OAuth redirect URL (use it in production so the callback always
 * matches what's registered in Google Cloud Console).
 */
export function googleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  return clientId && clientSecret ? { clientId, clientSecret, appUrl: process.env.APP_URL?.replace(/\/+$/, '') } : null
}

/**
 * Email (Resend) is optional in development, where messages are printed to the
 * terminal instead. In production sign-up and password reset need it: without
 * RESEND_API_KEY those endpoints answer 503 rather than pretend to send.
 * EMAIL_FROM must be an address on a domain verified in Resend (the default
 * onboarding@resend.dev only delivers to the Resend account owner).
 */
export function emailEnv() {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? { apiKey, from: process.env.EMAIL_FROM || `${SITE.name} <onboarding@resend.dev>` } : null
}

export function env() {
  if (cached) return cached
  const SESSION_SECRET = required('SESSION_SECRET')
  if (SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters')
  cached = {
    MONGODB_URI: required('MONGODB_URI'),
    MONGODB_DB: process.env.MONGODB_DB || 'taskora',
    SESSION_SECRET,
    isProd: process.env.NODE_ENV === 'production',
  }
  return cached
}
