import 'server-only'
import { SITE } from '@/constants/site'

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** One small, table-free layout that reads well in every mail client and in dark mode. */
function layout({ heading, intro, buttonLabel, url, outro }: { heading: string; intro: string; buttonLabel: string; url: string; outro: string }) {
  const safeUrl = escapeHtml(url)
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F6FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#16233F;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #DCE3F0;border-radius:12px;padding:32px;">
    <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#2F5BEA;">${escapeHtml(SITE.name)}</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${escapeHtml(heading)}</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">${intro}</p>
    <p style="margin:0 0 24px;"><a href="${safeUrl}" style="display:inline-block;background:#2F5BEA;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${escapeHtml(buttonLabel)}</a></p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5B6B8C;">Or paste this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${safeUrl}" style="color:#2F5BEA;">${safeUrl}</a></p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#5B6B8C;">${outro}</p>
  </div>
</body></html>`
}

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || 'there'

export function verificationEmail({ fullName, url }: { fullName: string; url: string }) {
  const name = firstName(fullName)
  return {
    subject: `Verify your email for ${SITE.name}`,
    html: layout({
      heading: 'Confirm your email address',
      intro: `Hi ${escapeHtml(name)}, thanks for joining ${escapeHtml(SITE.name)}. Confirm this is your email address to finish setting up. The link works for 24 hours.`,
      buttonLabel: 'Verify my email',
      url,
      outro: 'If you didn’t ask for this, you can ignore this email; nothing will change.',
    }),
    text: `Hi ${name},\n\nConfirm your email address for ${SITE.name} by opening this link (valid for 24 hours):\n\n${url}\n\nIf you didn’t ask for this, you can ignore this email.`,
  }
}

export function passwordResetEmail({ fullName, url }: { fullName: string; url: string }) {
  const name = firstName(fullName)
  return {
    subject: `Reset your ${SITE.name} password`,
    html: layout({
      heading: 'Reset your password',
      intro: `Hi ${escapeHtml(name)}, we got a request to reset the password for your ${escapeHtml(SITE.name)} account. The link works for 30 minutes and can be used once.`,
      buttonLabel: 'Choose a new password',
      url,
      outro: 'If you didn’t ask for this, you can ignore this email; your password stays the same.',
    }),
    text: `Hi ${name},\n\nReset your ${SITE.name} password by opening this link (valid for 30 minutes, one use):\n\n${url}\n\nIf you didn’t ask for this, you can ignore this email; your password stays the same.`,
  }
}
