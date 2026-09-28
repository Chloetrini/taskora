'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SuspenseUI from '@/components/shared/suspense-ui'
import { useMe } from '@/hooks/auth/use-auth'
import { safeNextPath } from '@/lib/utils'

/** Signed-in users skip /login and /register. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { data: user, isPending } = useMe()
  const router = useRouter()

  useEffect(() => {
    if (user) router.replace(safeNextPath(new URLSearchParams(window.location.search).get('next')))
  }, [user, router])

  if (isPending || user) return <SuspenseUI />
  return <>{children}</>
}
