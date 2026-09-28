'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Modal built on the native <dialog> element: showModal() gives us a real
 * focus trap, Esc to close, inert background and a ::backdrop for free.
 * Clicking the backdrop also closes it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      onClose={onClose}
      onClick={e => {
        // A click on the <dialog> itself (not its content) is a backdrop click.
        if (e.target === e.currentTarget) onClose()
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px]',
        className
      )}
    >
      <div className="relative p-6 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-primary-soft hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <h2 id="modal-title" className="pr-8 font-display text-2xl font-bold tracking-tight">
          {title}
        </h2>
        {description && (
          <p id="modal-description" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </dialog>
  )
}
