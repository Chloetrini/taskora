'use client'

import type { RefObject } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListChecks, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
 * navigation. It holds the app links and a New task button.
 */
export default function MobileMenu({ onClose, panelRef }: { onClose: () => void; panelRef: RefObject<HTMLElement | null> }) {
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
        <div className="grid gap-1">
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
        </div>
      </nav>
    </div>
  )
}
