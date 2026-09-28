import type { TodoCategory, TodoDueFilter, TodoPriority, TodoSort, TodoStatus } from '@/constants/todo-values'

export type { TodoCategory, TodoDueFilter, TodoPriority, TodoSort, TodoStatus }

// Mirrors the Todo model (src/server/models/todo.model.ts) minus userId,
// which the API never sends.
export interface Subtask {
  _id: string
  title: string
  done: boolean
}

export interface Todo {
  _id: string
  title: string
  notes: string
  priority: TodoPriority
  category: TodoCategory
  tags: string[]
  /** Calendar day as 'YYYY-MM-DD', or null. */
  dueDate: string | null
  subtasks: Subtask[]
  pinned: boolean
  completed: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TodoStats {
  total: number
  completed: number
  active: number
  overdue: number
  dueToday: number
  completedThisWeek: number
  completionRate: number
  byCategory: Record<TodoCategory, number>
  byPriority: Record<TodoPriority, number>
}

export interface TodoFilters {
  status: TodoStatus
  priority?: TodoPriority
  category?: TodoCategory
  tag?: string
  due: TodoDueFilter
  search?: string
  sort: TodoSort
}

export interface TodoInput {
  title: string
  notes?: string
  priority?: TodoPriority
  category?: TodoCategory
  tags?: string[]
  dueDate?: string | null
  subtasks?: { _id?: string; title: string; done?: boolean }[]
  pinned?: boolean
}

export type UpdateTodoInput = Partial<TodoInput & { completed: boolean }>
