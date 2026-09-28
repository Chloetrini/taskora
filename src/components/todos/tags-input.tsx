'use client'

import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { TAGS_MAX, TAG_LENGTH_MAX } from '@/constants/todo'

/** Type a tag, press Enter or comma to add it. Backspace on empty removes the last one. */
export default function TagsInput({ id, value, onChange }: { id: string; value: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const full = value.length >= TAGS_MAX

  const commit = () => {
    const tag = draft.trim().toLowerCase().replace(/^#/, '').slice(0, TAG_LENGTH_MAX)
    if (tag && !value.includes(tag) && !full) onChange([...value, tag])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-sm bg-primary-soft py-0.5 pr-1 pl-2 text-[13px] font-medium">
          #{tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} aria-label={`Remove tag ${tag}`} className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:text-foreground">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        disabled={full}
        maxLength={TAG_LENGTH_MAX + 1}
        placeholder={full ? `Up to ${TAGS_MAX} tags` : value.length ? 'Add another' : 'e.g. hng, urgent'}
        className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/80 focus-visible:outline-none disabled:cursor-not-allowed"
      />
    </div>
  )
}
