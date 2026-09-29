import { Suspense } from 'react'
import type { Metadata } from 'next'
import ResetPasswordView from '@/views/reset-password-view'

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  )
}
