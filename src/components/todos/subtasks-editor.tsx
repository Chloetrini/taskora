'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SUBTASKS_MAX, TITLE_MAX } from '@/constants/todo'
import type { TodoFormValues } from '@/lib/schema'
import { cn } from '@/lib/utils'

type Subtask = TodoFormValues['subtasks'][number]

export default function SubtasksEditor({ value, onChange }: { value: Subtask[]; onChange: (subtasks: Subtask[]) => void }) {
  const [draft, setDraft] = useState('')
  const full = value.length >= SUBTASKS_MAX

  const add = () => {
    const title = draft.trim()
    if (!title || full) return
    onChange([...value, { title, done: false }])
    setDraft('')
  }

  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface">
          {value.map((s, i) => (
            <li key={s._id ?? `new-${i}`} className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                checked={s.done}
                onChange={e => onChange(value.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
                aria-label={`Mark "${s.title}" as ${s.done ? 'not done' : 'done'}`}
                className="size-4 accent-[var(--done)]"
              />
              <input
                value={s.title}
                maxLength={TITLE_MAX}
                onChange={e => onChange(value.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                aria-label={`Subtask ${i + 1}`}
                className={cn('h-8 min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:outline-none', s.done && 'text-muted-foreground line-through')}
              />
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove subtask "${s.title}"`} className="grid size-7 place-items-center rounded-sm text-muted-foreground hover:text-destructive">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <label htmlFor="new-subtask" className="sr-only">
          New subtask
        </label>
        <input
          id="new-subtask"
          value={draft}
          maxLength={TITLE_MAX}
          disabled={full}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={full ? `Up to ${SUBTASKS_MAX} subtasks` : 'Add a step and press Enter'}
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
        />
        <Button variant="outline" onClick={add} disabled={!draft.trim() || full}>
          <Plus /> Add
        </Button>
      </div>
    </div>
  )
}
