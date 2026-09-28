import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Native select — accessible, mobile-friendly, and themed via color-scheme. */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-border bg-surface pr-9 pl-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
