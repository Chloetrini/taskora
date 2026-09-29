import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/server/config/db'
import { emailEnv } from '@/server/config/env'

export const dynamic = 'force-dynamic'

/** Open /api/health after deploying: "database": "connected" means Atlas is reachable. */
export async function GET() {
  let database = 'disconnected'
  try {
    await connectDB()
    await mongoose.connection.db?.admin().ping()
    database = 'connected'
  } catch {
    // reported below
  }
  const healthy = database === 'connected'
  return NextResponse.json(
    { status: healthy ? 'ok' : 'error', database, email: emailEnv() ? 'configured' : 'not configured', timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
