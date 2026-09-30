import { addDays, format, parseISO } from 'date-fns'
import { TODO_CATEGORIES, TODO_PRIORITIES } from '@/constants/todo-values'
import type { Todo, TodoFilters, TodoInput, TodoStats, UpdateTodoInput } from '@/types/todo'

/**
 * The whole task list lives in this browser (localStorage). There are no
 * accounts and no server data, so visitors can never see each other's tasks.
 * Pure functions over an array, plus a thin load/save layer that is safe to
 * import on the server (it only touches `window` when called).
 */

export const STORAGE_KEY = 'taskora-tasks-v1'
/** Sample tasks carry this id prefix so "Load sample data" can replace only them. */
export const SAMPLE_PREFIX = 'sample-'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

export function loadTodos(): Todo[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Todo[]) : []
  } catch {
    return []
  }
}

export function saveTodos(todos: Todo[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  } catch {
    // Storage full or blocked (private window): the change lasts until reload.
  }
}

const shiftDay = (day: string, days: number): string => format(addDays(parseISO(day), days), 'yyyy-MM-dd')

export const isLive = (t: Todo): boolean => !t.deletedAt
export const isTrashed = (t: Todo): boolean => Boolean(t.deletedAt)

export function buildStats(todos: Todo[], today: string): TodoStats {
  const weekAgo = new Date(`${shiftDay(today, -6)}T00:00:00`).getTime()
  const byCategory = Object.fromEntries(TODO_CATEGORIES.map(c => [c, 0])) as TodoStats['byCategory']
  const byPriority = Object.fromEntries(TODO_PRIORITIES.map(p => [p, 0])) as TodoStats['byPriority']
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
    byCategory[t.category]++
    byPriority[t.priority]++
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

/** Filter, search and sort the live tasks. Pinned always first. */
export function queryTodos(all: Todo[], filters: TodoFilters, today: string): Todo[] {
  const { status, priority, category, tag, due, search, sort } = filters
  const needle = search?.trim().toLowerCase()

  const matches = all.filter(t => {
    if (!isLive(t)) return false
    if (status === 'active' && t.completed) return false
    if (status === 'completed' && !t.completed) return false
    if (priority && t.priority !== priority) return false
    if (category && t.category !== category) return false
    if (tag && !t.tags.includes(tag)) return false
    if (due === 'today' && t.dueDate !== today) return false
    if (due === 'overdue' && !(t.dueDate && t.dueDate < today && !t.completed)) return false
    if (due === 'upcoming' && !(t.dueDate && t.dueDate > today && t.dueDate <= shiftDay(today, 7))) return false
    if (due === 'none' && t.dueDate) return false
    if (needle && ![t.title, t.notes, ...t.tags].some(text => text.toLowerCase().includes(needle))) return false
    return true
  })

  const byCreated = (a: Todo, b: Todo) => (sort === 'oldest' ? 1 : -1) * (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)
  const bySort = (a: Todo, b: Todo): number => {
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
  return matches.sort((a, b) => Number(b.pinned) - Number(a.pinned) || bySort(a, b) || byCreated(a, b))
}

export function buildTodo(input: TodoInput, now = new Date()): Todo {
  const stamp = now.toISOString()
  return {
    _id: newId(),
    title: input.title.trim(),
    notes: input.notes ?? '',
    priority: input.priority ?? 'medium',
    category: input.category ?? 'personal',
    tags: [...new Set((input.tags ?? []).map(t => t.trim().toLowerCase()).filter(Boolean))].slice(0, 5),
    dueDate: input.dueDate || null,
    subtasks: (input.subtasks ?? []).slice(0, 20).map(s => ({ _id: s._id ?? newId(), title: s.title, done: s.done ?? false })),
    pinned: input.pinned ?? false,
    completed: false,
    completedAt: null,
    deletedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export function applyUpdate(todo: Todo, data: UpdateTodoInput, now = new Date()): Todo {
  const { subtasks, tags, dueDate, completed, ...rest } = data
  const next: Todo = { ...todo, ...rest, updatedAt: now.toISOString() }
  if (subtasks) next.subtasks = subtasks.map(s => ({ _id: s._id ?? newId(), title: s.title, done: s.done ?? false }))
  if (tags) next.tags = [...new Set(tags.map(t => t.trim().toLowerCase()).filter(Boolean))].slice(0, 5)
  if (dueDate !== undefined) next.dueDate = dueDate || null
  // completedAt follows completed, so "done this week" stays honest.
  if (completed !== undefined) {
    next.completed = completed
    next.completedAt = completed ? now.toISOString() : null
  }
  return next
}

type SampleTask = Omit<TodoInput, 'dueDate'> & { day: number | null; done?: boolean }

const SAMPLES: SampleTask[] = [
  { title: 'Plan the week', notes: 'Pick three things that matter most and block time for them.', priority: 'high', category: 'work', tags: ['planning'], day: 0, pinned: true, subtasks: [
    { title: 'Review last week', done: true }, { title: 'Choose top three priorities' }, { title: 'Block time on the calendar' },
  ] },
  { title: 'Send the project update', notes: 'Short summary: what shipped, what is next, what is blocked.', priority: 'high', category: 'work', tags: ['email'], day: -1 },
  { title: 'Book a dentist appointment', priority: 'medium', category: 'health', tags: ['errands'], day: 2 },
  { title: 'Morning run', notes: '30 minutes, easy pace.', priority: 'low', category: 'health', tags: ['fitness'], day: 0, done: true },
  { title: 'Read chapter 4', notes: 'Take notes on the key definitions.', priority: 'medium', category: 'study', tags: ['reading'], day: 3, subtasks: [
    { title: 'Read the chapter' }, { title: 'Summarise in five bullet points' },
  ] },
  { title: 'Pay the electricity bill', priority: 'high', category: 'finance', tags: ['bills'], day: -2 },
  { title: 'Set a monthly budget', priority: 'medium', category: 'finance', tags: ['planning'], day: 6 },
  { title: 'Buy groceries', notes: 'Eggs, rice, spinach, oat milk.', priority: 'low', category: 'personal', tags: ['errands'], day: 1, subtasks: [
    { title: 'Write the list', done: true }, { title: 'Go to the shop' },
  ] },
  { title: 'Call Mum', priority: 'medium', category: 'personal', day: null },
  { title: 'Tidy the desk', priority: 'low', category: 'other', day: null, done: true },
]

/** Fresh sample tasks with dates relative to today, so the dashboard always has overdue, due-today and upcoming items. */
export function buildSamples(now = new Date()): Todo[] {
  return SAMPLES.map(({ day, done, ...input }, i) => {
    const created = new Date(now.getTime() - (SAMPLES.length - i) * 60_000)
    const todo = buildTodo({ ...input, dueDate: day === null ? null : format(addDays(now, day), 'yyyy-MM-dd') }, created)
    todo._id = `${SAMPLE_PREFIX}${i + 1}`
    todo.subtasks = todo.subtasks.map((s, j) => ({ ...s, _id: `${SAMPLE_PREFIX}${i + 1}-${j + 1}` }))
    return done ? applyUpdate(todo, { completed: true }, now) : todo
  })
}
