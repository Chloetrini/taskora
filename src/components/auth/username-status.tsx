import { Check, Loader2, X } from 'lucide-react'
import type { AvailabilityState } from '@/hooks/shared/use-username-availability'

export function UsernameStatus({ state }: { state: AvailabilityState }) {
  if (state.status === 'idle') return null
  if (state.status === 'checking') {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking…
      </span>
    )
  }
  if (state.status === 'available') {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-done">
        <Check className="size-3.5" aria-hidden /> Available
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
      <X className="size-3.5" aria-hidden /> {state.reason}
    </span>
  )
}
