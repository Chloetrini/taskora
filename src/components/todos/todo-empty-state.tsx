'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import type { TodoFilters } from '@/types/todo'

function message(filters: TodoFilters, filtered: boolean): { title: string; hint: string } {
  if (filtered) return { title: 'No tasks match', hint: 'Try different filters, or clear them.' }
  if (filters.status === 'active') return { title: 'Nothing left to do', hint: 'Everything on your list is ticked off.' }
  if (filters.status === 'completed') return { title: 'Nothing done yet', hint: 'Tick a task to see it here.' }
  return { title: 'Your list is empty', hint: 'Quick add a task above, or create one with notes, tags and subtasks.' }
}

export default function TodoEmptyState({ filters, filtered, onClearFilters }: { filters: TodoFilters; filtered: boolean; onClearFilters: () => void }) {
  const { title, hint } = message(filters, filtered)
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {filtered ? (
        <button type="button" onClick={onClearFilters} className="mt-4 text-sm font-medium text-primary underline underline-offset-4">
          Clear filters
        </button>
      ) : filters.status === 'all' ? (
        <Link href="/tasks/new" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}>
          Create a detailed task
        </Link>
      ) : null}
    </div>
  )
}
