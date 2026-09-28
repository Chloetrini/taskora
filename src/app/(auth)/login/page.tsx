import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginView from '@/views/login-view'
import { googleEnv } from '@/server/config/env'

// Rendered per request, not at build time, so the Google button appears as
// soon as GOOGLE_CLIENT_ID/SECRET are set — no rebuild needed.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Log in' }

export default function LoginPage() {
  // Read on the server: the Google button only shows when it's configured.
  return (
    <Suspense>
      <LoginView googleEnabled={Boolean(googleEnv())} />
    </Suspense>
  )
}
