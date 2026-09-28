import type { InputHTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20 aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  )
}
