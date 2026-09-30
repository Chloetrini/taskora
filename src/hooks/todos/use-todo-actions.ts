import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { clearAllData, clearCompletedTodos, loadSampleData, createTodo, deleteTodo, deleteTodoForever, emptyTrash, restoreTodo, toggleSubtask, updateTodo, type TodosListBody } from '@/api/todos'
import type { ApiResponse } from '@/api/client'
import type { Todo, TodoInput, UpdateTodoInput } from '@/types/todo'
import { todoKeys } from '@/hooks/todos/use-todos'

type ListCache = ApiResponse<TodosListBody> | undefined
type Snapshot = [readonly unknown[], ListCache][]

/**
 * Applies `change` to every cached list (every filter combination) at once
 * and returns a snapshot so onError can roll back. This is what makes
 * ticking a task feel instant.
 */
function useOptimisticLists() {
  const queryClient = useQueryClient()

  const apply = async (change: (body: TodosListBody) => TodosListBody): Promise<Snapshot> => {
    await queryClient.cancelQueries({ queryKey: todoKeys.lists() })
    const snapshot = queryClient.getQueriesData<ApiResponse<TodosListBody>>({ queryKey: todoKeys.lists() })
    queryClient.setQueriesData<ApiResponse<TodosListBody>>({ queryKey: todoKeys.lists() }, old =>
      old ? { ...old, body: change(old.body) } : old
    )
    return snapshot
  }

  const rollback = (snapshot: Snapshot | undefined) => {
    snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data))
  }

  // Always resync afterwards: the server decides which filtered list a task
  // belongs to, and stats/detail caches need refreshing too.
  const settle = () => queryClient.invalidateQueries({ queryKey: todoKeys.all })

  return { apply, rollback, settle }
}

const patchTodo = (body: TodosListBody, id: string, patch: (t: Todo) => Todo): TodosListBody => {
  const before = body.todos.find(t => t._id === id)
  const todos = body.todos.map(t => (t._id === id ? patch(t) : t))
  const after = todos.find(t => t._id === id)
  if (!before || !after || before.completed === after.completed) return { ...body, todos }
  const delta = after.completed ? 1 : -1
  const completed = body.stats.completed + delta
  return {
    todos,
    stats: {
      ...body.stats,
      completed,
      active: body.stats.total - completed,
      completionRate: body.stats.total ? Math.round((completed / body.stats.total) * 100) : 0,
    },
  }
}

export const useCreateTodo = () => {
  const { settle } = useOptimisticLists()
  return useMutation({
    mutationFn: (data: TodoInput) => createTodo(data),
    onSuccess: () => {
      toast.success('Task added')
    },
    onSettled: settle,
  })
}

export const useUpdateTodo = () => {
  const { apply, rollback, settle } = useOptimisticLists()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTodoInput }) => updateTodo(id, data),
    onMutate: ({ id, data }) => {
      // Subtask edits come from the full form — no optimistic merge needed there.
      const { subtasks: _subtasks, ...simple } = data
      return apply(body => patchTodo(body, id, t => ({ ...t, ...simple })))
    },
    onError: (error: Error, _vars, snapshot) => {
      rollback(snapshot)
      toast.error(error.message)
    },
    onSettled: settle,
  })
}

export const useToggleSubtask = () => {
  const { apply, rollback, settle } = useOptimisticLists()
  return useMutation({
    mutationFn: ({ id, subtaskId, done }: { id: string; subtaskId: string; done: boolean }) => toggleSubtask(id, subtaskId, done),
    onMutate: ({ id, subtaskId, done }) =>
      apply(body => patchTodo(body, id, t => ({ ...t, subtasks: t.subtasks.map(s => (s._id === subtaskId ? { ...s, done } : s)) }))),
    onError: (error: Error, _vars, snapshot) => {
      rollback(snapshot)
      toast.error(error.message)
    },
    onSettled: settle,
  })
}

export const useDeleteTodo = () => {
  const { apply, rollback, settle } = useOptimisticLists()
  return useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onMutate: id =>
      apply(body => {
        const removed = body.todos.find(t => t._id === id)
        if (!removed) return body
        const total = body.stats.total - 1
        const completed = body.stats.completed - (removed.completed ? 1 : 0)
        return {
          todos: body.todos.filter(t => t._id !== id),
          stats: { ...body.stats, total, completed, active: total - completed },
        }
      }),
    onSuccess: res => {
      toast.success(res.message) // "Task moved to trash"
    },
    onError: (error: Error, _id, snapshot) => {
      rollback(snapshot)
      toast.error(error.message)
    },
    onSettled: settle,
  })
}

export const useClearCompleted = () => {
  const { settle } = useOptimisticLists()
  return useMutation({
    mutationFn: clearCompletedTodos,
    onSuccess: res => {
      toast.success(res.message)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: settle,
  })
}

type TrashCache = ApiResponse<{ todos: Todo[] }> | undefined

/**
 * Optimistically drops tasks from the trash page (restore / delete forever /
 * empty), rolls back on error, and resyncs everything on settle — a restored
 * task has to reappear in the lists and stats.
 */
function useOptimisticTrash() {
  const queryClient = useQueryClient()

  const remove = async (keep: (t: Todo) => boolean): Promise<TrashCache> => {
    await queryClient.cancelQueries({ queryKey: todoKeys.trash() })
    const snapshot = queryClient.getQueryData<ApiResponse<{ todos: Todo[] }>>(todoKeys.trash())
    queryClient.setQueryData<ApiResponse<{ todos: Todo[] }>>(todoKeys.trash(), old =>
      old ? { ...old, body: { todos: old.body.todos.filter(keep) } } : old
    )
    return snapshot
  }

  const rollback = (snapshot: TrashCache) => {
    if (snapshot) queryClient.setQueryData(todoKeys.trash(), snapshot)
  }

  const settle = () => queryClient.invalidateQueries({ queryKey: todoKeys.all })

  return { remove, rollback, settle }
}

export const useRestoreTodo = () => {
  const { remove, rollback, settle } = useOptimisticTrash()
  return useMutation({
    mutationFn: (id: string) => restoreTodo(id),
    onMutate: id => remove(t => t._id !== id),
    onSuccess: res => {
      toast.success(res.message)
    },
    onError: (error: Error, _id, snapshot) => {
      rollback(snapshot)
      toast.error(error.message)
    },
    onSettled: settle,
  })
}

export const useDeleteForever = () => {
  const { remove, rollback, settle } = useOptimisticTrash()
  return useMutation({
    mutationFn: (id: string) => deleteTodoForever(id),
    onMutate: id => remove(t => t._id !== id),
    onSuccess: res => {
      toast.success(res.message)
    },
    onError: (error: Error, _id, snapshot) => {
      rollback(snapshot)
      toast.error(error.message)
    },
    onSettled: settle,
  })
}

export const useEmptyTrash = () => {
  const { remove, rollback, settle } = useOptimisticTrash()
  return useMutation({
    mutationFn: emptyTrash,
    onMutate: () => remove(() => false),
    onSuccess: res => {
      toast.success(res.message)
    },
    onError: (error: Error, _vars, snapshot) => {
      rollback(snapshot)
      toast.error(error.message)
    },
    onSettled: settle,
  })
}

export const useLoadSampleData = () => {
  const { settle } = useOptimisticLists()
  return useMutation({
    mutationFn: loadSampleData,
    onSuccess: res => {
      toast.success(res.message)
    },
    onSettled: settle,
  })
}

export const useClearAllData = () => {
  const { settle } = useOptimisticLists()
  return useMutation({
    mutationFn: clearAllData,
    onSuccess: res => {
      toast.success(res.message)
    },
    onSettled: settle,
  })
}
