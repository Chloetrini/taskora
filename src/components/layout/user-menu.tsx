'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, UserRound } from 'lucide-react'
import { toast } from 'react-toastify'
import type { User } from '@/types/user'
import { Avatar } from '@/components/ui/avatar'
import { useLogout } from '@/hooks/auth/use-auth'

/**
 * Takes the user as a prop (from the navbar's useMe) instead of
 * useCurrentUser(): the navbar also renders on public pages (landing, 404),
 * which are outside RequireAuth.
 */
export default function UserMenu({ user }: { user: User }) {
  const logout = useLogout()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('Logged out')
        router.replace('/')
      },
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full"
      >
        <Avatar name={user.fullName} seed={user.username} size="sm" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-black/10">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-[13px] text-muted-foreground">@{user.username}</p>
          </div>
          <Link
            role="menuitem"
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-primary-soft"
          >
            <UserRound className="size-4 text-muted-foreground" /> Profile
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={onLogout}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      )}
    </div>
  )
}
