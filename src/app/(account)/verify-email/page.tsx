import { Suspense } from 'react'
import type { Metadata } from 'next'
import VerifyEmailView from '@/views/verify-email-view'

// The link carries a secret token: never indexed, never sent on as a Referer.
export const metadata: Metadata = { title: 'Verify your email', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailView />
    </Suspense>
  )
}
