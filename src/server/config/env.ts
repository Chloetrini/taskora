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
 * "Taskora <me@example.com>" or a bare "me@example.com" → { name, email }, or
 * null if it isn't an address. The name defaults to the product name.
 */
export function parseSender(value: string): { name: string; email: string } | null {
  const text = value.trim()
  const withName = /^"?([^"<>]*?)"?\s*<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>$/.exec(text)
  if (withName) return { name: withName[1].trim() || SITE.name, email: withName[2] }
  if (/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(text)) return { name: SITE.name, email: text }
  return null
}

/**
 * Email (Brevo) is optional in development, where messages are printed to the
 * terminal instead. In production sign-up and password reset need it: without
 * both BREVO_API_KEY and EMAIL_FROM those endpoints answer 503 rather than
 * pretend to send. EMAIL_FROM must be a sender you verified in Brevo
 * (Senders, domains & dedicated IPs); Brevo rejects any other address.
 */
export function emailEnv() {
  const apiKey = process.env.BREVO_API_KEY
  const from = parseSender(process.env.EMAIL_FROM ?? '')
  return apiKey && from ? { apiKey, from } : null
}

/**
 * MemCachier (memcached) is optional, same variables as Eventra. Without
 * MEMCACHIER_SERVERS nothing is cached and every read goes to MongoDB.
 */
export function memcachierEnv() {
  const servers = process.env.MEMCACHIER_SERVERS?.trim()
  return servers ? { servers, username: process.env.MEMCACHIER_USERNAME, password: process.env.MEMCACHIER_PASSWORD } : null
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
