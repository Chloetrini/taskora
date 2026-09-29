import 'server-only'
import { emailEnv } from '@/server/config/env'
import { HttpError } from '@/server/lib/http'

export type Email = { to: string; subject: string; html: string; text: string }

/**
 * Call at the top of any endpoint that must send email. In production without
 * BREVO_API_KEY + EMAIL_FROM it stops with a clear 503 (nothing created, nothing half-done);
 * in development it lets the request through and sendEmail() prints the message.
 */
export function assertEmailReady() {
  if (!emailEnv() && process.env.NODE_ENV === 'production') {
    throw new HttpError(503, 'Email isn’t set up on this server yet, so we can’t send messages. Please try again later.')
  }
}

/**
 * Sends through Brevo's transactional email API (no SDK needed). Throws on failure — callers
 * decide whether that matters to the user (see account-email.service.ts).
 */
export async function sendEmail(email: Email): Promise<void> {
  const config = emailEnv()
  if (!config) {
    // Development: no provider, so show what would have been sent (links included).
    console.info(`\n[email] to: ${email.to}\n[email] subject: ${email.subject}\n${email.text}\n`)
    return
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: config.from,
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Brevo responded ${res.status}: ${detail.slice(0, 300)}`)
  }
}
