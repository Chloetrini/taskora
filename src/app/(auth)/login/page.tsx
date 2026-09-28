import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginView from '@/views/login-view'
import { googleEnv } from '@/server/config/env'

// Rendered per request, not at build time, so the Google button appears as
// soon as GOOGLE_CLIENT_ID/SECRET are set — no rebuild needed.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to Taskora with Google, or with your email or username, to see your tasks.',
  // ?next= and ?error= variants all point at the one login page.
  alternates: { canonical: '/login' },
}

export default function LoginPage() {
  // Read on the server: the Google button only shows when it's configured.
  return (
    <Suspense>
      <LoginView googleEnabled={Boolean(googleEnv())} />
    </Suspense>
  )
}
