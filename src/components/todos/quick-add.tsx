'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TITLE_MAX } from '@/constants/todo'
import { useCreateTodo } from '@/hooks/todos/use-todo-actions'

/** Title-only add for speed. Everything else lives on /tasks/new. */
export default function QuickAdd() {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const createTodo = useCreateTodo()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setError('Give the task a name')
    setError('')
    createTodo.mutate({ title: trimmed }, { onSuccess: () => setTitle(''), onError: err => setError(err.message) })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-lg border border-border bg-surface p-2 focus-within:border-primary/60">
      <div className="flex items-center gap-2">
        <label htmlFor="quick-add" className="sr-only">
          Quick add a task
        </label>
        <input
          id="quick-add"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          autoComplete="off"
          placeholder="Quick add a task and press Enter"
          aria-invalid={!!error}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-muted-foreground/80 focus-visible:outline-none"
        />
        <Button type="submit" disabled={createTodo.isPending} className="h-10">
          <Plus />
          <span className="hidden sm:inline">Add</span>
          <span className="sr-only sm:hidden">Add</span>
        </Button>
      </div>
      <div className="flex items-center justify-between px-3 pt-1 pb-0.5 text-[13px]">
        {error ? <p className="text-destructive">{error}</p> : <span />}
        <Link href="/tasks/new" className="font-medium text-primary hover:underline">
          More options
        </Link>
      </div>
    </form>
  )
}
