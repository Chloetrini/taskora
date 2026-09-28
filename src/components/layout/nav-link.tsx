'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/** A Link that highlights when it matches the current route. */
export function NavLink({ href, exact = false, className, children }: { href: string; exact?: boolean; className?: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-primary-soft text-foreground' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </Link>
  )
}
