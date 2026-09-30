import { ApiError, type ApiResponse } from '@/api/client'
import { todayKey } from '@/lib/utils'
import {
  SAMPLE_PREFIX,
  applyUpdate,
  buildSamples,
  buildStats,
  buildTodo,
  isLive,
  isTrashed,
  loadTodos,
  queryTodos,
  saveTodos,
} from '@/lib/local-store'
import type { Todo, TodoFilters, TodoInput, TodoStats, UpdateTodoInput } from '@/types/todo'

/**
 * Same function names and `{ success, message, body }` shape the hooks always
 * used, but the data lives in this browser (`lib/local-store.ts`) instead of
 * behind an API. Nothing here talks to a server.
 */

export interface TodosListBody {
  todos: Todo[]
  stats: TodoStats
}

const respond = <T>(message: string, body: T): Promise<ApiResponse<T>> => Promise.resolve({ success: true, message, body })

const notFound = (message = 'Task not found') => new ApiError(message, 404)

const findLive = (all: Todo[], id: string): Todo => {
  const todo = all.find(t => t._id === id && isLive(t))
  if (!todo) throw notFound()
  return todo
}

const replace = (all: Todo[], next: Todo): Todo[] => all.map(t => (t._id === next._id ? next : t))

export const getTodos = (filters: TodoFilters) => {
  const all = loadTodos()
  const today = todayKey()
  return respond('Todos fetched', { todos: queryTodos(all, filters, today), stats: buildStats(all.filter(isLive), today) })
}

export const getTodoStats = () => respond('Stats fetched', buildStats(loadTodos().filter(isLive), todayKey()))

export const getTodo = async (id: string) => respond('Task fetched', findLive(loadTodos(), id))

export const createTodo = (data: TodoInput) => {
  const todo = buildTodo(data)
  saveTodos([todo, ...loadTodos()])
  return respond('Task added', todo)
}

export const updateTodo = async (id: string, data: UpdateTodoInput) => {
  const all = loadTodos()
  const next = applyUpdate(findLive(all, id), data)
  saveTodos(replace(all, next))
  return respond('Task updated', next)
}

export const toggleSubtask = async (id: string, subtaskId: string, done: boolean) => {
  const all = loadTodos()
  const todo = findLive(all, id)
  if (!todo.subtasks.some(s => s._id === subtaskId)) throw notFound('Subtask not found')
  const next: Todo = { ...todo, subtasks: todo.subtasks.map(s => (s._id === subtaskId ? { ...s, done } : s)), updatedAt: new Date().toISOString() }
  saveTodos(replace(all, next))
  return respond('Subtask updated', next)
}

/** Moves the task to the trash. */
export const deleteTodo = async (id: string) => {
  const all = loadTodos()
  const todo = findLive(all, id)
  saveTodos(replace(all, { ...todo, deletedAt: new Date().toISOString() }))
  return respond('Task moved to trash', { _id: id })
}

/** Moves every completed task to the trash. */
export const clearCompletedTodos = () => {
  const now = new Date().toISOString()
  let deletedCount = 0
  const next = loadTodos().map(t => {
    if (!isLive(t) || !t.completed) return t
    deletedCount++
    return { ...t, deletedAt: now }
  })
  saveTodos(next)
  return respond(deletedCount === 1 ? 'Moved 1 completed task to trash' : `Moved ${deletedCount} completed tasks to trash`, { deletedCount })
}

export const getTrash = () => {
  const todos = loadTodos()
    .filter(isTrashed)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
  return respond('Trash fetched', { todos })
}

export const restoreTodo = async (id: string) => {
  const all = loadTodos()
  const todo = all.find(t => t._id === id && isTrashed(t))
  if (!todo) throw notFound('Task not found in trash')
  const next = { ...todo, deletedAt: null }
  saveTodos(replace(all, next))
  return respond('Task restored', next)
}

export const deleteTodoForever = async (id: string) => {
  const all = loadTodos()
  if (!all.some(t => t._id === id && isTrashed(t))) throw notFound('Task not found in trash')
  saveTodos(all.filter(t => t._id !== id))
  return respond('Task deleted forever', { _id: id })
}

export const emptyTrash = () => {
  const all = loadTodos()
  const deletedCount = all.filter(isTrashed).length
  saveTodos(all.filter(isLive))
  return respond(deletedCount === 1 ? 'Deleted 1 task forever' : `Deleted ${deletedCount} tasks forever`, { deletedCount })
}

/** Adds the sample tasks, replacing any earlier copy of them but never touching the visitor's own tasks. */
export const loadSampleData = () => {
  const own = loadTodos().filter(t => !t._id.startsWith(SAMPLE_PREFIX))
  const samples = buildSamples()
  saveTodos([...samples.slice().reverse(), ...own])
  return respond(`Loaded ${samples.length} sample tasks`, { count: samples.length })
}

/** Back to the empty state: every task, including the trash. */
export const clearAllData = () => {
  const count = loadTodos().length
  saveTodos([])
  return respond('All data cleared', { count })
}
