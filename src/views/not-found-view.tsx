'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function NotFoundView() {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <p className="font-display text-7xl font-extrabold tracking-tight text-primary">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold">This page doesn’t exist</h1>
      <p className="mt-1 text-sm text-muted-foreground">Check the address, or head back home.</p>
      <Link href="/" className={buttonVariants({ variant: 'outline', className: 'mt-6' })}>
        Back to home
      </Link>
    </div>
  )
}
