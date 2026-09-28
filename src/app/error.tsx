'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Something broke on this page</h1>
      <p className="max-w-md text-muted-foreground">Try again, or go back to your list.</p>
      <div className="mt-4 flex gap-4 text-sm font-medium">
        <button type="button" onClick={reset} className="text-primary underline underline-offset-4">
          Try again
        </button>
        <a href="/dashboard" className="text-primary underline underline-offset-4">
          Back to your list
        </a>
      </div>
    </div>
  )
}
