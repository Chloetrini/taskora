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

export type EmailCheck = {
  configured: boolean
  /** Does Brevo accept BREVO_API_KEY? */
  apiKey: 'valid' | 'rejected' | 'unknown'
  /** Is EMAIL_FROM an active, verified sender in Brevo? */
  sender: 'verified' | 'not verified' | 'unknown'
  /** Has Brevo switched on transactional (API/SMTP) sending for the account? */
  transactional: 'enabled' | 'not enabled' | 'unknown'
  ok: boolean
  /** What to do next, in plain words. */
  hint: string
}

/**
 * Asks Brevo (read-only, nothing is sent) whether the key, the sender and
 * transactional sending are all in order, and says what to fix if not.
 * Served by GET /api/health?check=email so a deployment can be diagnosed
 * without reading server logs.
 */
export async function checkEmailSetup(): Promise<EmailCheck> {
  const config = emailEnv()
  if (!config) {
    return {
      configured: false,
      apiKey: 'unknown',
      sender: 'unknown',
      transactional: 'unknown',
      ok: false,
      hint: 'Set BREVO_API_KEY and EMAIL_FROM in the environment (EMAIL_FROM like: Taskora <sender@example.com>, with no quotation marks around it) and redeploy.',
    }
  }
  const headers = { 'api-key': config.apiKey, Accept: 'application/json' }
  type BrevoReply = { message?: string; relay?: { enabled?: boolean }; senders?: { email?: string; active?: boolean }[] }
  const ask = async (path: string) => {
    const res = await fetch(`https://api.brevo.com/v3/${path}`, { headers })
    const body = (await res.json().catch(() => ({}))) as BrevoReply
    return { status: res.status, body }
  }

  let account, senders
  try {
    ;[account, senders] = await Promise.all([ask('account'), ask('senders')])
  } catch {
    return { configured: true, apiKey: 'unknown', sender: 'unknown', transactional: 'unknown', ok: false, hint: 'Could not reach Brevo from the server. Try again in a minute.' }
  }

  if (account.status === 401 || account.status === 403 || senders.status === 401) {
    const message = account.body.message ?? senders.body.message ?? ''
    const hint = /ip|authoris|authoriz/i.test(message)
      ? 'Brevo blocked the request because the server’s IP address isn’t on your authorised list. In Brevo go to Security → Authorised IPs and deactivate the blocking (Vercel’s IP addresses change, so they can’t be listed).'
      : 'Brevo rejected BREVO_API_KEY. Create a new API key (SMTP & API → API keys, it starts with xkeysib-), paste it with no spaces, and redeploy.'
    return { configured: true, apiKey: 'rejected', sender: 'unknown', transactional: 'unknown', ok: false, hint }
  }

  const list = Array.isArray(senders.body.senders) ? senders.body.senders : []
  const match = list.find(s => s.email?.toLowerCase() === config.from.email.toLowerCase())
  const sender = senders.status === 200 ? (match?.active ? 'verified' : 'not verified') : 'unknown'
  const relayEnabled = account.body.relay?.enabled
  const transactional = account.status === 200 ? (relayEnabled === false ? 'not enabled' : 'enabled') : 'unknown'

  let hint = 'Everything Brevo can check looks fine. If mail still doesn’t arrive, look in the spam folder and in Brevo → Transactional → Logs.'
  if (sender === 'not verified') {
    hint = `${config.from.email} isn’t a verified sender in Brevo. Add and verify it under Senders, domains & dedicated IPs, or change EMAIL_FROM to a sender that is verified there.`
  } else if (transactional === 'not enabled') {
    hint = 'Brevo hasn’t activated transactional email for this account yet. Ask Brevo support to activate it (they often do this after a short review of a new account).'
  }
  return { configured: true, apiKey: 'valid', sender, transactional, ok: sender === 'verified' && transactional === 'enabled', hint }
}
