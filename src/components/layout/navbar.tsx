'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Moon, Plus, Sun, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import UserMenu from '@/components/layout/user-menu'
import { NavLink } from '@/components/layout/nav-link'
import { useTheme } from '@/context/theme-context'
import { useMe } from '@/hooks/auth/use-auth'
import { SITE } from '@/constants/site'
import { cn } from '@/lib/utils'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md">
      <span className="grid size-7 place-items-center rounded-[9px] bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path d="M6 12.5l3.8 3.8L18 8" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-tight">{SITE.name}</span>
    </Link>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {/* Both icons render; CSS shows the right one, so the server HTML matches before the theme is known. */}
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  )
}

export default function Navbar() {
  const { data: user } = useMe()
  const pathname = usePathname()
  // The menu remembers which page it was opened on, so navigating closes it
  // without a setState-in-effect.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const menuOpen = openOn === pathname

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {user ? (
              <>
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/tasks" exact>
                  All tasks
                </NavLink>
                <NavLink href="/trash">Trash</NavLink>
              </>
            ) : (
              <Link href="/#features" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Features
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/tasks/new" className={cn(buttonVariants({ size: 'sm' }), 'hidden h-9 sm:inline-flex')}>
                <Plus /> New task
              </Link>
              <div className="ml-1 hidden md:block">
                <UserMenu user={user} />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Log in
              </Link>
              <Link href="/register" className={cn(buttonVariants({ size: 'sm' }), 'h-9')}>
                Get started
              </Link>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(user ? 'md:hidden' : 'sm:hidden')}
            onClick={() => setOpenOn(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-border bg-surface px-4 py-3 md:hidden">
          {user ? (
            <div className="grid gap-1">
              <div className="mb-2 flex items-center justify-between px-3 py-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.fullName}</p>
                  <p className="truncate text-[13px] text-muted-foreground">@{user.username}</p>
                </div>
                <UserMenu user={user} />
              </div>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/tasks" exact>
                All tasks
              </NavLink>
              <NavLink href="/trash">Trash</NavLink>
              <NavLink href="/profile">Profile</NavLink>
              <Link href="/tasks/new" className={cn(buttonVariants(), 'mt-2')}>
                <Plus /> New task
              </Link>
            </div>
          ) : (
            <div className="grid gap-2">
              <Link href="/#features" className="rounded-md px-3 py-2 text-sm font-medium">
                Features
              </Link>
              <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
                Log in
              </Link>
              <Link href="/register" className={buttonVariants()}>
                Get started
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  )
}
