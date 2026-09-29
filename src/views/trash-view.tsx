'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import PageWrapper from '@/components/layout/page-wrapper'
import TodosSkeleton from '@/components/skeletons/todos-skeleton'
import { Button, buttonVariants } from '@/components/ui/button'
import { CATEGORY_META, PRIORITY_META } from '@/constants/todo'
import { useTrash } from '@/hooks/todos/use-todos'
import { useDeleteForever, useEmptyTrash, useRestoreTodo } from '@/hooks/todos/use-todo-actions'
import { useDismiss } from '@/hooks/shared/use-dismiss'
import { cn } from '@/lib/utils'
import type { Todo } from '@/types/todo'

function TrashItem({ todo }: { todo: Todo }) {
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLDivElement>(null)
  useDismiss(confirmRef, confirming, () => setConfirming(false))
  const restore = useRestoreTodo()
  const deleteForever = useDeleteForever()
  const category = CATEGORY_META[todo.category]
  const CategoryIcon = category.icon
  const priority = PRIORITY_META[todo.priority]

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] leading-snug font-medium break-words', todo.completed && 'text-muted-foreground line-through')}>{todo.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium">
            <CategoryIcon className="size-3.5" aria-hidden />
            {category.label}
          </span>
          <span className={cn('inline-flex items-center gap-1.5 font-medium', priority.text)}>
            <span className={cn('size-1.5 rounded-full', priority.dot)} aria-hidden />
            {priority.label}
          </span>
          {todo.deletedAt && <span>Deleted {formatDistanceToNow(parseISO(todo.deletedAt), { addSuffix: true })}</span>}
        </div>
      </div>

      {confirming ? (
        <div ref={confirmRef} role="group" aria-label={`Confirm deleting "${todo.title}" forever`} className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5">
          <p className="text-sm font-medium">Delete forever?</p>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteForever.mutate(todo._id)}>
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => restore.mutate(todo._id)} aria-label={`Restore "${todo.title}"`}>
            <RotateCcw /> Restore
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-destructive hover:bg-destructive/10 sm:flex-none" onClick={() => setConfirming(true)} aria-label={`Delete "${todo.title}" forever`}>
            <Trash2 /> Delete forever
          </Button>
        </div>
      )}
    </li>
  )
}

function EmptyTrashButton({ count }: { count: number }) {
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLDivElement>(null)
  const emptyTrash = useEmptyTrash()
  useDismiss(confirmRef, confirming, () => setConfirming(false))

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
        <Trash2 /> Empty trash
      </Button>
    )
  }
  return (
    <div ref={confirmRef} role="group" aria-label="Confirm emptying the trash" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5">
      <p className="text-sm font-medium">Delete {count === 1 ? '1 task' : `all ${count} tasks`} forever?</p>
      <div className="flex gap-1.5">
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="bg-destructive text-white hover:bg-destructive/90"
          disabled={emptyTrash.isPending}
          onClick={() => emptyTrash.mutate(undefined, { onSettled: () => setConfirming(false) })}
        >
          Empty trash
        </Button>
      </div>
    </div>
  )
}

export default function TrashView() {
  const { data: todos, isPending, isError, error, refetch } = useTrash()

  return (
    <PageWrapper size="wide">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em]">Trash</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restore a task to put it back on your list, or delete it forever.</p>
        </div>
        {todos && todos.length > 0 && <EmptyTrashButton count={todos.length} />}
      </div>

      <section className="mt-6">
        {isPending ? (
          <TodosSkeleton />
        ) : isError ? (
          <div role="alert" className="rounded-lg border border-destructive/40 px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold">The trash didn’t load</p>
            <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RotateCw /> Try again
            </Button>
          </div>
        ) : todos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <p className="font-display text-lg font-semibold">Trash is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Deleted tasks wait here until you restore them or delete them forever.</p>
            <Link href="/tasks" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}>
              Back to all tasks
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {todos.map(todo => (
              <TrashItem key={todo._id} todo={todo} />
            ))}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}
