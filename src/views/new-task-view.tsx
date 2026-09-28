'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import PageWrapper from '@/components/layout/page-wrapper'
import TodoForm from '@/components/todos/todo-form'
import { toTodoInput } from '@/lib/schema'
import { useCreateTodo } from '@/hooks/todos/use-todo-actions'

export default function NewTaskView() {
  const createTodo = useCreateTodo()
  const router = useRouter()

  return (
    <PageWrapper size="wide">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em]">New task</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">Only the title is required.</p>
      <TodoForm
        submitLabel="Add task"
        isSubmitting={createTodo.isPending}
        onSubmit={values =>
          createTodo.mutate(toTodoInput(values), {
            onSuccess: () => router.push('/tasks'),
            onError: err => toast.error(err.message),
          })
        }
      />
    </PageWrapper>
  )
}
