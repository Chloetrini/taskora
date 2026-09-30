'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Moon, Plus, Sun, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import MobileMenu from '@/components/layout/mobile-menu'
import { NavLink } from '@/components/layout/nav-link'
import { useTheme } from '@/context/theme-context'
import { useDismiss } from '@/hooks/shared/use-dismiss'
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
  const pathname = usePathname()
  // The menu remembers which page it was opened on, so navigating closes it
  // without a setState-in-effect.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const menuOpen = openOn === pathname
  const panelRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Pressing outside the panel or Escape closes it, not just the X. The toggle
  // button is ignored: it opens and closes the menu itself.
  useDismiss(panelRef, menuOpen, () => setOpenOn(null), toggleRef)

  // Don't let the page scroll underneath the open menu.
  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/tasks" exact>
                All tasks
              </NavLink>
              <NavLink href="/trash">Trash</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/tasks/new" className={cn(buttonVariants({ size: 'sm' }), 'hidden h-9 sm:inline-flex')}>
              <Plus /> New task
            </Link>
            <Button
              ref={toggleRef}
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpenOn(menuOpen ? null : pathname)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      {menuOpen && <MobileMenu onClose={() => setOpenOn(null)} panelRef={panelRef} />}
    </>
  )
}
