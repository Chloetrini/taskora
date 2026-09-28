'use client'

import Link from 'next/link'
import { Plus, RotateCw, Trash2 } from 'lucide-react'
import PageWrapper from '@/components/layout/page-wrapper'
import QuickAdd from '@/components/todos/quick-add'
import TodoToolbar from '@/components/todos/todo-toolbar'
import TodoGrid from '@/components/todos/todo-grid'
import TodoEmptyState from '@/components/todos/todo-empty-state'
import TodosSkeleton from '@/components/skeletons/todos-skeleton'
import { Button, buttonVariants } from '@/components/ui/button'
import { useTodos } from '@/hooks/todos/use-todos'
import { useTodoFilters } from '@/hooks/todos/use-todo-filters'
import { useClearCompleted } from '@/hooks/todos/use-todo-actions'

export default function TasksView() {
  const { filters, setFilter, clearFilters, activeFilterCount } = useTodoFilters()
  const { data, isPending, isError, error, refetch, isFetching } = useTodos(filters)
  const clearCompleted = useClearCompleted()

  return (
    <PageWrapper size="wide">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em]">All tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.stats.active} to do, ${data.stats.completed} done` : 'Loading…'}
          </p>
        </div>
        <Link href="/tasks/new" className={buttonVariants({ className: 'sm:hidden' })}>
          <Plus /> New task
        </Link>
      </div>

      <div className="mt-6 grid gap-4">
        <QuickAdd />
        {/* key: remount when filters are cleared so the local search box resets */}
        <TodoToolbar
          key={filters.search ? 'search' : 'no-search'}
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          stats={data?.stats}
        />
      </div>

      <section className="mt-4" aria-busy={isFetching}>
        {isPending ? (
          <TodosSkeleton />
        ) : isError ? (
          <div role="alert" className="rounded-lg border border-destructive/40 px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold">Your tasks didn’t load</p>
            <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RotateCw /> Try again
            </Button>
          </div>
        ) : data.todos.length === 0 ? (
          <TodoEmptyState filters={filters} filtered={activeFilterCount > 0} onClearFilters={clearFilters} />
        ) : (
          <TodoGrid todos={data.todos} onTagClick={tag => setFilter('tag', tag)} />
        )}

        <div className="mt-3 flex justify-end gap-1">
          {data && data.stats.completed > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearCompleted.mutate()} disabled={clearCompleted.isPending}>
              Clear {data.stats.completed} completed
            </Button>
          )}
          <Link href="/trash" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <Trash2 /> Trash
          </Link>
        </div>
      </section>
    </PageWrapper>
  )
}
