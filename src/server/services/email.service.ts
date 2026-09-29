import 'server-only'
import { emailEnv } from '@/server/config/env'
import { HttpError } from '@/server/lib/http'

export type Email = { to: string; subject: string; html: string; text: string }

/**
 * Call at the top of any endpoint that must send email. In production without
 * RESEND_API_KEY it stops with a clear 503 (nothing created, nothing half-done);
 * in development it lets the request through and sendEmail() prints the message.
 */
export function assertEmailReady() {
  if (!emailEnv() && process.env.NODE_ENV === 'production') {
    throw new HttpError(503, 'Email isn’t set up on this server yet, so we can’t send messages. Please try again later.')
  }
}

/**
 * Sends through Resend's HTTP API (no SDK needed). Throws on failure — callers
 * decide whether that matters to the user (see account-email.service.ts).
 */
export async function sendEmail(email: Email): Promise<void> {
  const config = emailEnv()
  if (!config) {
    // Development: no provider, so show what would have been sent (links included).
    console.info(`\n[email] to: ${email.to}\n[email] subject: ${email.subject}\n${email.text}\n`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend responded ${res.status}: ${detail.slice(0, 300)}`)
  }
}
