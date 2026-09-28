import { Suspense } from 'react'
import type { Metadata } from 'next'
import RegisterView from '@/views/register-view'
import { googleEnv } from '@/server/config/env'

// Rendered per request, not at build time, so the Google button appears as
// soon as GOOGLE_CLIENT_ID/SECRET are set — no rebuild needed.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a free Taskora account in seconds and start organising your tasks with notes, subtasks and tags.',
  alternates: { canonical: '/register' },
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterView googleEnabled={Boolean(googleEnv())} />
    </Suspense>
  )
}
