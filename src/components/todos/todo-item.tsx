'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronDown, ListChecks, Pencil, Pin, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { CATEGORY_META, PRIORITY_META } from '@/constants/todo'
import { cn, describeDueDate, type DueTone } from '@/lib/utils'
import { useDeleteTodo, useToggleSubtask, useUpdateTodo } from '@/hooks/todos/use-todo-actions'
import type { Todo } from '@/types/todo'

export const DUE_TONE: Record<DueTone, string> = {
  overdue: 'text-destructive',
  today: 'text-primary',
  soon: 'text-foreground',
  later: 'text-muted-foreground',
}

export function TodoCheckbox({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={todo.completed}
      aria-label={todo.completed ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`}
      data-checked={todo.completed}
      onClick={onToggle}
      className={cn(
        'mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors',
        todo.completed ? 'border-done bg-done text-white' : 'border-muted-foreground/40 hover:border-primary'
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <path className="check-path" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export default function TodoItem({ todo, onTagClick }: { todo: Todo; onTagClick?: (tag: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const toggleSubtask = useToggleSubtask()

  const due = todo.dueDate ? describeDueDate(todo.dueDate, todo.completed) : null
  const priority = PRIORITY_META[todo.priority]
  const category = CATEGORY_META[todo.category]
  const CategoryIcon = category.icon
  const doneSubtasks = todo.subtasks.filter(s => s.done).length
  const hasDetails = todo.subtasks.length > 0 || todo.notes.length > 140

  return (
    <li className={cn('group px-4 py-3.5', todo.pinned && !todo.completed && 'bg-primary-soft/35')}>
      <div className="flex items-start gap-3">
        <TodoCheckbox todo={todo} onToggle={() => updateTodo.mutate({ id: todo._id, data: { completed: !todo.completed } }, { onSuccess: () => toast.success(todo.completed ? 'Task marked as to do' : 'Task completed') })} />

        <div className="min-w-0 flex-1">
          <p className={cn('text-[15px] leading-snug font-medium break-words', todo.completed && 'text-muted-foreground')}>
            {todo.pinned && <Pin aria-label="Pinned" className="mr-1.5 -mt-0.5 inline size-3.5 fill-primary text-primary" />}
            <span className="ink-strike" data-done={todo.completed}>
              {todo.title}
            </span>
          </p>

          {todo.notes && (
            <p className={cn('mt-0.5 text-sm leading-relaxed whitespace-pre-line break-words text-muted-foreground', !expanded && 'line-clamp-2', todo.completed && 'opacity-70')}>
              {todo.notes}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
              <CategoryIcon className="size-3.5" aria-hidden />
              {category.label}
            </span>
            <span className={cn('inline-flex items-center gap-1.5 font-medium', priority.text)}>
              <span className={cn('size-1.5 rounded-full', priority.dot)} aria-hidden />
              {priority.label}
            </span>
            {due && (
              <span className={cn('inline-flex items-center gap-1 font-medium', todo.completed ? 'text-muted-foreground' : DUE_TONE[due.tone])}>
                <CalendarDays className="size-3.5" aria-hidden />
                {due.label}
              </span>
            )}
            {todo.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                <ListChecks className="size-3.5" aria-hidden />
                {doneSubtasks}/{todo.subtasks.length}
              </span>
            )}
            {todo.tags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="rounded-sm font-medium text-primary hover:underline"
                aria-label={`Show tasks tagged ${tag}`}
              >
                #{tag}
              </button>
            ))}
          </div>

          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
              {expanded ? 'Hide details' : todo.subtasks.length ? `Show ${todo.subtasks.length} subtask${todo.subtasks.length === 1 ? '' : 's'}` : 'Show full notes'}
            </button>
          )}

          {expanded && todo.subtasks.length > 0 && (
            <ul className="mt-2 grid gap-1.5 border-l-2 border-border pl-3">
              {todo.subtasks.map(s => (
                <li key={s._id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={() => toggleSubtask.mutate({ id: todo._id, subtaskId: s._id, done: !s.done })}
                      className="size-4 accent-[var(--done)]"
                    />
                    <span className={cn(s.done && 'text-muted-foreground line-through')}>{s.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => updateTodo.mutate({ id: todo._id, data: { pinned: !todo.pinned } }, { onSuccess: () => toast.success(todo.pinned ? 'Task unpinned' : 'Task pinned') })}
            aria-label={todo.pinned ? `Unpin "${todo.title}"` : `Pin "${todo.title}"`}
            title={todo.pinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className={cn(todo.pinned && 'fill-primary text-primary')} />
          </Button>
          <Link
            href={`/tasks/${todo._id}/edit`}
            aria-label={`Edit "${todo.title}"`}
            title="Edit"
            className="inline-grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-primary-soft hover:text-foreground"
          >
            <Pencil className="size-4" />
          </Link>
          <Button variant="destructive" size="icon-sm" onClick={() => deleteTodo.mutate(todo._id)} aria-label={`Delete "${todo.title}"`} title="Delete">
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  )
}
