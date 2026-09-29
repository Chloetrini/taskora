'use client'

import type { RefObject } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, LayoutDashboard, ListChecks, LogIn, LogOut, Plus, Sparkles, Trash2, UserPlus, type LucideIcon } from 'lucide-react'
import { toast } from 'react-toastify'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { useLogout } from '@/hooks/auth/use-auth'
import { cn } from '@/lib/utils'
import type { User } from '@/types/user'

const ROW = 'flex h-12 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors'

function MenuLink({ href, icon: Icon, exact, onNavigate, children }: { href: string; icon: LucideIcon; exact?: boolean; onNavigate: () => void; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(ROW, active ? 'bg-primary-soft text-foreground' : 'text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground')}
    >
      <Icon className={cn('size-5', active && 'text-primary')} aria-hidden />
      {children}
    </Link>
  )
}

/**
 * The phone/tablet menu: a panel under the header over a dimmed page.
 * The parent closes it on an outside press (the dimmed area), Escape, and
 * navigation. Signed-in users get their account card, the app links, a New
 * task button and Log out right here, instead of a second dropdown.
 */
export default function MobileMenu({ user, onClose, panelRef }: { user: User | null | undefined; onClose: () => void; panelRef: RefObject<HTMLElement | null> }) {
  const logout = useLogout()
  const router = useRouter()

  // Close only AFTER logout finishes: unmounting the menu first would drop
  // these callbacks (TanStack skips per-call callbacks of an unmounted component),
  // and the toast and redirect would never happen.
  const onLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('Logged out')
        router.replace('/')
        onClose()
      },
    })
  }

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-30 md:hidden">
      {/* Dimmed page. Pressing it is "outside the panel", which closes the menu. */}
      <div aria-hidden className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <nav
        id="mobile-menu"
        ref={panelRef}
        aria-label="Mobile"
        className="menu-panel relative max-h-full overflow-y-auto overscroll-contain border-b border-border bg-surface p-3 shadow-2xl shadow-black/20"
      >
        {user ? (
          <div className="grid gap-1">
            <Link
              href="/profile"
              onClick={onClose}
              aria-label="Your profile"
              className="mb-1 flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-primary-soft/60"
            >
              <Avatar name={user.fullName} seed={user.username} src={user.avatarUrl} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{user.fullName}</span>
                <span className="block truncate text-[13px] text-muted-foreground">@{user.username}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>

            <MenuLink href="/dashboard" icon={LayoutDashboard} onNavigate={onClose}>
              Dashboard
            </MenuLink>
            <MenuLink href="/tasks" icon={ListChecks} exact onNavigate={onClose}>
              All tasks
            </MenuLink>
            <MenuLink href="/trash" icon={Trash2} onNavigate={onClose}>
              Trash
            </MenuLink>

            <Link href="/tasks/new" onClick={onClose} className={cn(buttonVariants(), 'mt-2 h-12 text-[15px]')}>
              <Plus /> New task
            </Link>

            <div className="my-2 h-px bg-border" />
            <button type="button" onClick={onLogout} disabled={logout.isPending} className={cn(ROW, 'text-destructive hover:bg-destructive/10')}>
              <LogOut className="size-5" aria-hidden />
              {logout.isPending ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        ) : (
          <div className="grid gap-1">
            <MenuLink href="/#features" icon={Sparkles} onNavigate={onClose}>
              Features
            </MenuLink>
            <div className="mt-2 grid gap-2">
              <Link href="/login" onClick={onClose} className={cn(buttonVariants({ variant: 'outline' }), 'h-12 text-[15px]')}>
                <LogIn /> Log in
              </Link>
              <Link href="/register" onClick={onClose} className={cn(buttonVariants(), 'h-12 text-[15px]')}>
                <UserPlus /> Get started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </div>
  )
}
