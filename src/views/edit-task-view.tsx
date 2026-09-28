'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import PageWrapper from '@/components/layout/page-wrapper'
import TodoForm from '@/components/todos/todo-form'
import TodosSkeleton from '@/components/skeletons/todos-skeleton'
import { useTodo } from '@/hooks/todos/use-todos'
import { useUpdateTodo } from '@/hooks/todos/use-todo-actions'
import { toTodoInput, type TodoFormValues } from '@/lib/schema'

export default function EditTaskView() {
  const { id } = useParams<{ id: string }>()
  const { data: todo, isPending, isError } = useTodo(id)
  const updateTodo = useUpdateTodo()
  const router = useRouter()

  if (isPending) {
    return (
      <PageWrapper size="wide">
        <TodosSkeleton />
      </PageWrapper>
    )
  }

  if (isError || !todo) {
    return (
      <PageWrapper size="wide" className="py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Task not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted.</p>
        <Link href="/tasks" className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4">
          Back to all tasks
        </Link>
      </PageWrapper>
    )
  }

  const defaults: TodoFormValues = {
    title: todo.title,
    notes: todo.notes,
    priority: todo.priority,
    category: todo.category,
    dueDate: todo.dueDate ?? '',
    tags: todo.tags,
    subtasks: todo.subtasks.map(s => ({ _id: s._id, title: s.title, done: s.done })),
    pinned: todo.pinned,
  }

  return (
    <PageWrapper size="wide">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em]">Edit task</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">Changes save when you press Save changes.</p>
      <TodoForm
        defaultValues={defaults}
        submitLabel="Save changes"
        isSubmitting={updateTodo.isPending}
        onSubmit={values =>
          updateTodo.mutate(
            { id: todo._id, data: toTodoInput(values) },
            {
              onSuccess: () => {
                toast.success('Task updated')
                router.push('/tasks')
              },
            }
          )
        }
      />
    </PageWrapper>
  )
}
