import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export default function PageWrapper({ children, className, size = 'default' }: { children: ReactNode; className?: string; size?: 'default' | 'narrow' | 'wide' }) {
  const widths = { narrow: 'max-w-2xl', default: 'max-w-4xl', wide: 'max-w-6xl' }
  return <div className={cn('mx-auto container px-4 sm:px-6', widths[size], className)}>{children}</div>
}
