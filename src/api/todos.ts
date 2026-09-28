import { api } from '@/api/client'
import { todayKey } from '@/lib/utils'
import type { Todo, TodoFilters, TodoInput, TodoStats, UpdateTodoInput } from '@/types/todo'

export interface TodosListBody {
  todos: Todo[]
  stats: TodoStats
}

const toQueryString = (filters: TodoFilters): string => {
  const params = new URLSearchParams()
  if (filters.status !== 'all') params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.category) params.set('category', filters.category)
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.due !== 'any') params.set('due', filters.due)
  if (filters.search) params.set('search', filters.search)
  if (filters.sort !== 'newest') params.set('sort', filters.sort)
  // The server can't know the viewer's timezone; due filters use our "today".
  params.set('today', todayKey())
  return `?${params.toString()}`
}

export const getTodos = (filters: TodoFilters) => api.get<TodosListBody>(`/todos${toQueryString(filters)}`)
export const getTodoStats = () => api.get<TodoStats>(`/todos/stats?today=${todayKey()}`)
export const getTodo = (id: string) => api.get<Todo>(`/todos/${id}`)
export const createTodo = (data: TodoInput) => api.post<Todo>('/todos', data)
export const updateTodo = (id: string, data: UpdateTodoInput) => api.patch<Todo>(`/todos/${id}`, data)
export const toggleSubtask = (id: string, subtaskId: string, done: boolean) =>
  api.patch<Todo>(`/todos/${id}/subtasks/${subtaskId}`, { done })
export const deleteTodo = (id: string) => api.delete<{ _id: string }>(`/todos/${id}`)
export const clearCompletedTodos = () => api.delete<{ deletedCount: number }>('/todos/completed')
