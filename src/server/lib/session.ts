import 'server-only'
import { sealData, unsealData } from 'iron-session'
import type { NextRequest, NextResponse } from 'next/server'
import { env } from '@/server/config/env'

/*
 * Sessions are an encrypted, signed cookie (iron-session's sealData). The
 * browser can't read or forge it; JS can't touch it (httpOnly). It carries
 * only the user id and a session version — see requireUser in auth.ts.
 */

export const SESSION_COOKIE = 'taskora_session'
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

export type SessionData = { uid: string; v: number }

export async function readSession(req: NextRequest): Promise<SessionData | null> {
  const sealed = req.cookies.get(SESSION_COOKIE)?.value
  if (!sealed) return null
  try {
    const data = await unsealData<Partial<SessionData>>(sealed, { password: env().SESSION_SECRET, ttl: MAX_AGE_SECONDS })
    return typeof data.uid === 'string' && typeof data.v === 'number' ? { uid: data.uid, v: data.v } : null
  } catch {
    return null // tampered, expired, or sealed with an old secret
  }
}

export async function setSessionCookie(res: NextResponse, data: SessionData): Promise<void> {
  const sealed = await sealData(data, { password: env().SESSION_SECRET, ttl: MAX_AGE_SECONDS })
  res.cookies.set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: env().isProd,
    // Frontend and API are the same origin now, so 'lax' is enough.
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}
