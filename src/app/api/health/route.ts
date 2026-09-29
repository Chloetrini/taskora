import { NextResponse, type NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/server/config/db'
import { emailEnv, memcachierEnv } from '@/server/config/env'
import { checkEmailSetup } from '@/server/services/email.service'
import { clientIp, LIMITS, rateLimit } from '@/server/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Open /api/health after deploying: "database": "connected" means Atlas is reachable.
 * /api/health?check=email also asks Brevo whether the key, sender and transactional
 * sending are set up (read-only; limited to a few calls per IP) and says what to fix.
 */
export async function GET(req: NextRequest) {
  let database = 'disconnected'
  try {
    await connectDB()
    await mongoose.connection.db?.admin().ping()
    database = 'connected'
  } catch {
    // reported below
  }
  const healthy = database === 'connected'

  let emailCheck
  if (req.nextUrl.searchParams.get('check') === 'email') {
    try {
      rateLimit(`email-check:${clientIp(req)}`, LIMITS.email.limit, LIMITS.email.windowMs)
      emailCheck = await checkEmailSetup()
    } catch {
      return NextResponse.json({ status: 'error', message: 'Too many checks. Try again in a few minutes.' }, { status: 429 })
    }
  }

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'error',
      database,
      email: emailEnv() ? 'configured' : 'not configured',
      cache: memcachierEnv() ? 'configured' : 'not configured',
      ...(emailCheck ? { emailCheck } : {}),
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
