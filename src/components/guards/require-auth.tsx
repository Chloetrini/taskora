'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import SuspenseUI from '@/components/shared/suspense-ui'
import { useMe } from '@/hooks/auth/use-auth'
import type { User } from '@/types/user'

const CurrentUserContext = createContext<User | null>(null)

/**
 * Second line of defence behind proxy.ts (which redirects when there's no
 * session cookie at all). This catches a cookie that exists but is no longer
 * valid — the API clears it, and we send the user to /login.
 *
 * It also provides the signed-in user to everything inside it. On logout the
 * `me` query flips to null a moment before the page navigates away; holding
 * the last known user means nothing inside can crash during that moment.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: user, isPending } = useMe()
  const router = useRouter()
  const pathname = usePathname()
  // "Remember the previous value" via state set during render — React's
  // documented pattern for deriving state from changing data.
  const [lastUser, setLastUser] = useState<User | null>(user ?? null)
  if (user && user !== lastUser) setLastUser(user)

  useEffect(() => {
    if (!isPending && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`)
    }
  }, [isPending, user, router, pathname])

  const current = user ?? lastUser
  if (!current) return <SuspenseUI />
  return <CurrentUserContext.Provider value={current}>{children}</CurrentUserContext.Provider>
}

/** The signed-in user. Only valid inside RequireAuth (every page in the (app) group). */
export function useCurrentUser(): User {
  const user = useContext(CurrentUserContext)
  if (!user) throw new Error('useCurrentUser must be used inside RequireAuth')
  return user
}
