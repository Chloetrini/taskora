'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ListChecks, Pencil, Pin, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button, buttonVariants } from '@/components/ui/button'
import { DUE_TONE, TodoCheckbox } from '@/components/todos/todo-item'
import { CATEGORY_META, PRIORITY_META } from '@/constants/todo'
import { cn, describeDueDate } from '@/lib/utils'
import { useDeleteTodo, useToggleSubtask, useUpdateTodo } from '@/hooks/todos/use-todo-actions'
import type { Todo } from '@/types/todo'

/**
 * Card used on the All tasks grid. Category and priority on top, Edit and
 * Delete always visible; Delete asks for confirmation inside the card.
 */
export default function TodoCard({ todo, onTagClick }: { todo: Todo; onTagClick?: (tag: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAllSubtasks, setShowAllSubtasks] = useState(false)
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const toggleSubtask = useToggleSubtask()

  const category = CATEGORY_META[todo.category]
  const CategoryIcon = category.icon
  const priority = PRIORITY_META[todo.priority]
  const due = todo.dueDate ? describeDueDate(todo.dueDate, todo.completed) : null
  const doneSubtasks = todo.subtasks.filter(s => s.done).length
  const visibleSubtasks = showAllSubtasks ? todo.subtasks : todo.subtasks.slice(0, 3)

  return (
    <li
      className={cn(
        'flex flex-col rounded-lg border bg-surface p-4 transition-shadow hover:shadow-lg hover:shadow-primary/5',
        todo.pinned && !todo.completed ? 'border-primary/40' : 'border-border'
      )}
    >
      {/* Top row: category + priority, pin */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <CategoryIcon className="size-3.5 text-muted-foreground" aria-hidden />
            {category.label}
          </span>
          <span className={cn('inline-flex items-center gap-1.5', priority.text)}>
            <span className={cn('size-1.5 rounded-full', priority.dot)} aria-hidden />
            {priority.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => updateTodo.mutate({ id: todo._id, data: { pinned: !todo.pinned } }, { onSuccess: () => toast.success(todo.pinned ? 'Task unpinned' : 'Task pinned') })}
          aria-label={todo.pinned ? `Unpin "${todo.title}"` : `Pin "${todo.title}"`}
          title={todo.pinned ? 'Unpin' : 'Pin to top'}
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-primary-soft hover:text-foreground"
        >
          <Pin className={cn('size-4', todo.pinned && 'fill-primary text-primary')} />
        </button>
      </div>

      <hr className="my-3 border-border" />

      {/* Title + notes */}
      <div className="flex items-start gap-3">
        <TodoCheckbox todo={todo} onToggle={() => updateTodo.mutate({ id: todo._id, data: { completed: !todo.completed } }, { onSuccess: () => toast.success(todo.completed ? 'Task marked as to do' : 'Task completed') })} />
        <div className="min-w-0 flex-1">
          <h3 className={cn('text-base leading-snug font-semibold break-words', todo.completed && 'text-muted-foreground')}>
            <span className="ink-strike" data-done={todo.completed}>
              {todo.title}
            </span>
          </h3>
          {todo.notes && (
            <p className={cn('mt-1 line-clamp-3 text-sm leading-relaxed whitespace-pre-line break-words text-muted-foreground', todo.completed && 'opacity-70')}>
              {todo.notes}
            </p>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {todo.subtasks.length > 0 && (
        <div className="mt-3 rounded-md bg-primary-soft/40 px-3 py-2.5">
          <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ListChecks className="size-3.5" aria-hidden />
            {doneSubtasks} of {todo.subtasks.length} steps done
          </p>
          <ul className="grid gap-1">
            {visibleSubtasks.map(s => (
              <li key={s._id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={() => toggleSubtask.mutate({ id: todo._id, subtaskId: s._id, done: !s.done })}
                    className="size-4 accent-[var(--done)]"
                  />
                  <span className={cn('truncate', s.done && 'text-muted-foreground line-through')}>{s.title}</span>
                </label>
              </li>
            ))}
          </ul>
          {todo.subtasks.length > 3 && (
            <button type="button" onClick={() => setShowAllSubtasks(v => !v)} className="mt-1.5 text-xs font-medium text-primary hover:underline">
              {showAllSubtasks ? 'Show fewer' : `Show all ${todo.subtasks.length}`}
            </button>
          )}
        </div>
      )}

      {/* Due + tags */}
      {(due || todo.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {due && (
            <span className={cn('inline-flex items-center gap-1 font-medium', todo.completed ? 'text-muted-foreground' : DUE_TONE[due.tone])}>
              <CalendarDays className="size-3.5" aria-hidden />
              {due.label}
            </span>
          )}
          {todo.tags.map(tag => (
            <button key={tag} type="button" onClick={() => onTagClick?.(tag)} className="rounded-sm font-medium text-primary hover:underline" aria-label={`Show tasks tagged ${tag}`}>
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Actions — pushed to the bottom so cards in a row line up */}
      <div className="mt-auto pt-4">
        {confirmDelete ? (
          <div role="group" aria-label={`Confirm deleting "${todo.title}"`} className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
            <p className="text-sm font-medium">Move to trash?</p>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteTodo.mutate(todo._id)}>
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href={`/tasks/${todo._id}/edit`} aria-label={`Edit "${todo.title}"`} className={cn(buttonVariants({ size: 'sm' }), 'flex-1')}>
              <Pencil /> Edit
            </Link>
            <Button variant="outline" size="sm" className="flex-1 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)} aria-label={`Delete "${todo.title}"`}>
              <Trash2 /> Delete
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}
