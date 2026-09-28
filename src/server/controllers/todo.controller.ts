import 'server-only'
import { Types } from 'mongoose'
import type { NextRequest } from 'next/server'
import Todo from '@/server/models/todo.model'
import { TODO_CATEGORIES, TODO_PRIORITIES, type TodoPriority } from '@/constants/todo-values'
import { HttpError, ok, parseBody, parseQuery } from '@/server/lib/http'
import { requireUser } from '@/server/lib/auth'
import { LIMITS, rateLimit } from '@/server/lib/rate-limit'
import { addDays, escapeRegExp, isValidObjectId, utcToday } from '@/server/lib/helpers'
import { createTodoBody, listTodosQuery, statsQuery, toggleSubtaskBody, updateTodoBody, type ListTodosQuery } from '@/lib/validation'

// Hard cap per request — a personal list never needs more, and it keeps a
// runaway client from pulling an unbounded result set.
const MAX_TODOS = 500
const PUBLIC_FIELDS = '-userId -__v'
const PRIORITY_RANK: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 }

type SubtaskDoc = { _id: unknown; title: string; done: boolean }
type TodoDoc = {
  _id: unknown
  title: string
  notes: string
  priority: TodoPriority
  category: string
  tags: string[]
  dueDate: string | null
  subtasks: SubtaskDoc[]
  pinned: boolean
  completed: boolean
  completedAt: Date | null
  deletedAt?: Date | null
}

// `deletedAt: null` also matches documents created before the trash existed
// (no field at all), so every live-task query adds LIVE.
const LIVE = { deletedAt: null }
const TRASHED = { deletedAt: { $ne: null } }

/** New subtasks get an id up front so the client can key and toggle them. */
const withSubtaskIds = (subtasks: { _id?: string; title: string; done?: boolean }[]) =>
  subtasks.map(s => ({ _id: s._id ? new Types.ObjectId(s._id) : new Types.ObjectId(), title: s.title, done: s.done ?? false }))

const requireId = (id: string, label = 'task') => {
  if (!isValidObjectId(id)) throw new HttpError(400, `Invalid ${label} id`)
}

/**
 * Pinned first, then the chosen sort. Done in memory: "no due date" must
 * sink, priority is an enum, and the list is capped anyway. Input arrives
 * newest- or oldest-first from Mongo; Array.sort is stable, so that breaks ties.
 */
const sortTodos = (todos: TodoDoc[], sort: ListTodosQuery['sort']): TodoDoc[] => {
  const bySort = (a: TodoDoc, b: TodoDoc): number => {
    if (sort === 'due') {
      if (a.dueDate === b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    }
    if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (sort === 'title') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    return 0
  }
  return [...todos].sort((a, b) => Number(b.pinned) - Number(a.pinned) || bySort(a, b))
}

type StatsInput = Pick<TodoDoc, 'completed' | 'completedAt' | 'dueDate' | 'category' | 'priority'>

export const buildStats = (todos: StatsInput[], today: string) => {
  const weekAgo = new Date(`${addDays(today, -6)}T00:00:00Z`).getTime()
  const byCategory = Object.fromEntries(TODO_CATEGORIES.map(c => [c, 0])) as Record<string, number>
  const byPriority = Object.fromEntries(TODO_PRIORITIES.map(p => [p, 0])) as Record<string, number>
  let completed = 0
  let overdue = 0
  let dueToday = 0
  let completedThisWeek = 0

  for (const t of todos) {
    if (t.completed) {
      completed++
      if (t.completedAt && new Date(t.completedAt).getTime() >= weekAgo) completedThisWeek++
      continue
    }
    // Category/priority/due counts describe the work still left to do.
    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1
    if (t.dueDate && t.dueDate < today) overdue++
    if (t.dueDate === today) dueToday++
  }

  const total = todos.length
  return {
    total,
    completed,
    active: total - completed,
    overdue,
    dueToday,
    completedThisWeek,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    byCategory,
    byPriority,
  }
}

const loadStats = async (userId: string, today: string) => {
  const all = await Todo.find({ userId, ...LIVE }).select('completed completedAt dueDate category priority').lean<StatsInput[]>()
  return buildStats(all, today)
}

export async function listTodos(req: NextRequest) {
  const { userId } = await requireUser(req)
  const { status, priority, category, tag, due, search, sort, today = utcToday() } = parseQuery(req, listTodosQuery)

  const filter: Record<string, unknown> = { userId, ...LIVE }
  if (status === 'active') filter.completed = false
  if (status === 'completed') filter.completed = true
  if (priority) filter.priority = priority
  if (category) filter.category = category
  if (tag) filter.tags = tag
  if (due === 'today') filter.dueDate = today
  if (due === 'overdue') {
    filter.dueDate = { $lt: today }
    filter.completed = false
  }
  if (due === 'upcoming') filter.dueDate = { $gt: today, $lte: addDays(today, 7) }
  if (due === 'none') filter.dueDate = null
  if (search) {
    const pattern = new RegExp(escapeRegExp(search), 'i')
    filter.$or = [{ title: pattern }, { notes: pattern }, { tags: pattern }]
  }

  const [todos, stats] = await Promise.all([
    Todo.find(filter)
      .sort({ createdAt: sort === 'oldest' ? 1 : -1 })
      .limit(MAX_TODOS)
      .select(PUBLIC_FIELDS)
      .lean<TodoDoc[]>(),
    loadStats(userId, today),
  ])

  return ok('Todos fetched', { todos: sortTodos(todos, sort), stats })
}

export async function getStats(req: NextRequest) {
  const { userId } = await requireUser(req)
  const { today = utcToday() } = parseQuery(req, statsQuery)
  return ok('Stats fetched', await loadStats(userId, today))
}

export async function getTodo(req: NextRequest, id: string) {
  const { userId } = await requireUser(req)
  requireId(id)
  const todo = await Todo.findOne({ _id: id, userId, ...LIVE }).select(PUBLIC_FIELDS).lean()
  // Same 404 for "doesn't exist" and "belongs to someone else".
  if (!todo) throw new HttpError(404, 'Task not found')
  return ok('Task fetched', todo)
}

export async function createTodo(req: NextRequest) {
  const { userId } = await requireUser(req)
  rateLimit(`create:${userId}`, LIMITS.createTask.limit, LIMITS.createTask.windowMs)
  const input = await parseBody(req, createTodoBody)

  const todo = await Todo.create({ ...input, subtasks: withSubtaskIds(input.subtasks), userId })
  const { userId: _u, __v: _v, ...body } = todo.toObject() as unknown as Record<string, unknown>
  return ok('Task added', body, 201)
}

export async function updateTodo(req: NextRequest, id: string) {
  const { userId } = await requireUser(req)
  requireId(id)
  const updates = await parseBody(req, updateTodoBody)

  const set: Record<string, unknown> = { ...updates }
  if (updates.subtasks) set.subtasks = withSubtaskIds(updates.subtasks)
  // completedAt follows completed, so "done this week" stays honest.
  if (updates.completed !== undefined) set.completedAt = updates.completed ? new Date() : null

  const todo = await Todo.findOneAndUpdate({ _id: id, userId, ...LIVE }, { $set: set }, { new: true, runValidators: true }).select(PUBLIC_FIELDS).lean()
  if (!todo) throw new HttpError(404, 'Task not found')
  return ok('Task updated', todo)
}

export async function toggleSubtask(req: NextRequest, id: string, subtaskId: string) {
  const { userId } = await requireUser(req)
  requireId(id)
  requireId(subtaskId, 'subtask')
  const { done } = await parseBody(req, toggleSubtaskBody)

  const todo = await Todo.findOne({ _id: id, userId, ...LIVE }).select('subtasks').lean<{ subtasks: SubtaskDoc[] }>()
  if (!todo) throw new HttpError(404, 'Task not found')
  if (!todo.subtasks.some(s => String(s._id) === subtaskId)) throw new HttpError(404, 'Subtask not found')

  const subtasks = todo.subtasks.map(s => (String(s._id) === subtaskId ? { ...s, done } : s))
  const updated = await Todo.findOneAndUpdate({ _id: id, userId, ...LIVE }, { $set: { subtasks } }, { new: true }).select(PUBLIC_FIELDS).lean()
  return ok('Subtask updated', updated)
}

/** DELETE /todos/[id] — moves the task to the trash (restorable). */
export async function deleteTodo(req: NextRequest, id: string) {
  const { userId } = await requireUser(req)
  requireId(id)
  const todo = await Todo.findOneAndUpdate({ _id: id, userId, ...LIVE }, { $set: { deletedAt: new Date() } }).select('_id').lean()
  if (!todo) throw new HttpError(404, 'Task not found')
  return ok('Task moved to trash', { _id: id })
}

/** DELETE /todos/completed — moves every completed task to the trash. */
export async function clearCompleted(req: NextRequest) {
  const { userId } = await requireUser(req)
  const { modifiedCount } = await Todo.updateMany({ userId, completed: true, ...LIVE }, { $set: { deletedAt: new Date() } })
  return ok(modifiedCount === 1 ? 'Moved 1 completed task to trash' : `Moved ${modifiedCount} completed tasks to trash`, { deletedCount: modifiedCount })
}

/** GET /todos/trash — this user's trashed tasks, most recently deleted first. */
export async function listTrash(req: NextRequest) {
  const { userId } = await requireUser(req)
  const todos = await Todo.find({ userId, ...TRASHED }).sort({ deletedAt: -1 }).limit(MAX_TODOS).select(PUBLIC_FIELDS).lean<TodoDoc[]>()
  return ok('Trash fetched', { todos })
}

/** POST /todos/[id]/restore — back to the list exactly as it was. */
export async function restoreTodo(req: NextRequest, id: string) {
  const { userId } = await requireUser(req)
  requireId(id)
  const todo = await Todo.findOneAndUpdate({ _id: id, userId, ...TRASHED }, { $set: { deletedAt: null } }, { new: true }).select(PUBLIC_FIELDS).lean()
  if (!todo) throw new HttpError(404, 'Task not found in trash')
  return ok('Task restored', todo)
}

/** DELETE /todos/[id]/permanent — only a task already in the trash can be deleted for good. */
export async function deleteTodoForever(req: NextRequest, id: string) {
  const { userId } = await requireUser(req)
  requireId(id)
  const todo = await Todo.findOneAndDelete({ _id: id, userId, ...TRASHED }).select('_id').lean()
  if (!todo) throw new HttpError(404, 'Task not found in trash')
  return ok('Task deleted forever', { _id: id })
}

/** DELETE /todos/trash — empties this user's trash. */
export async function emptyTrash(req: NextRequest) {
  const { userId } = await requireUser(req)
  const { deletedCount } = await Todo.deleteMany({ userId, ...TRASHED })
  return ok(deletedCount === 1 ? 'Deleted 1 task forever' : `Deleted ${deletedCount} tasks forever`, { deletedCount })
}
