import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Label + control + hint/error, with the ids wired for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20 aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  )
}
