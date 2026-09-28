'use client'

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Pin } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Field, Textarea } from '@/components/ui/field'
import TagsInput from '@/components/todos/tags-input'
import SubtasksEditor from '@/components/todos/subtasks-editor'
import { CATEGORIES, CATEGORY_META, NOTES_MAX, PRIORITIES, PRIORITY_META, TITLE_MAX } from '@/constants/todo'
import { EMPTY_TODO_FORM, todoFormSchema, type TodoFormValues } from '@/lib/schema'
import { cn } from '@/lib/utils'

/** One form for both /tasks/new and /tasks/:id/edit. */
export default function TodoForm({
  defaultValues = EMPTY_TODO_FORM,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  defaultValues?: TodoFormValues
  submitLabel: string
  isSubmitting: boolean
  onSubmit: (values: TodoFormValues) => void
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TodoFormValues>({ resolver: zodResolver(todoFormSchema), defaultValues })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <Field id="task-title" label="Title" error={errors.title?.message}>
        <Input id="task-title" autoFocus maxLength={TITLE_MAX} placeholder="What needs doing?" aria-invalid={!!errors.title} className="h-11 text-[15px]" {...register('title')} />
      </Field>

      <Field id="task-notes" label="Notes" error={errors.notes?.message} hint="Links, context, anything you'll want later.">
        <Textarea id="task-notes" rows={4} maxLength={NOTES_MAX} placeholder="Add notes" aria-invalid={!!errors.notes} {...register('notes')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="task-category" label="Category">
          <Select id="task-category" {...register('category')}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="task-priority" label="Priority">
          <Select id="task-priority" {...register('priority')}>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="task-due" label="Due date">
          <Input id="task-due" type="date" {...register('dueDate')} />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">Subtasks</p>
        <Controller control={control} name="subtasks" render={({ field }) => <SubtasksEditor value={field.value} onChange={field.onChange} />} />
        {errors.subtasks?.message && <p className="mt-1.5 text-[13px] text-destructive">{errors.subtasks.message}</p>}
      </div>

      <Controller
        control={control}
        name="pinned"
        render={({ field }) => (
          <button
            type="button"
            role="switch"
            aria-checked={field.value}
            onClick={() => field.onChange(!field.value)}
            className={cn(
              'flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
              field.value ? 'border-primary/50 bg-primary-soft' : 'border-border bg-surface hover:bg-primary-soft/50'
            )}
          >
            <Pin className={cn('size-4', field.value ? 'fill-primary text-primary' : 'text-muted-foreground')} />
            <span>
              <span className="block font-medium">Pin to top</span>
              <span className="block text-[13px] text-muted-foreground">Pinned tasks stay above everything else.</span>
            </span>
          </button>
        )}
      />

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Link href="/tasks" className={buttonVariants({ variant: 'ghost' })}>
          Cancel
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
