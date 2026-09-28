import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getTodo, getTodos, getTodoStats, getTrash } from '@/api/todos'
import type { TodoFilters } from '@/types/todo'

export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: TodoFilters) => [...todoKeys.lists(), filters] as const,
  stats: () => [...todoKeys.all, 'stats'] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
  trash: () => [...todoKeys.all, 'trash'] as const,
}

/**
 * The user's list for the current filters, plus unfiltered stats.
 * keepPreviousData stops the list flashing to a skeleton on every filter change.
 */
export const useTodos = (filters: TodoFilters) =>
  useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => getTodos(filters),
    select: res => res.body,
    placeholderData: keepPreviousData,
  })

export const useTodoStats = () =>
  useQuery({
    queryKey: todoKeys.stats(),
    queryFn: getTodoStats,
    select: res => res.body,
  })

export const useTodo = (id: string | undefined) =>
  useQuery({
    queryKey: todoKeys.detail(id ?? ''),
    queryFn: () => getTodo(id as string),
    select: res => res.body,
    enabled: Boolean(id),
    retry: false,
  })

/** Trashed tasks, most recently deleted first. */
export const useTrash = () =>
  useQuery({
    queryKey: todoKeys.trash(),
    queryFn: getTrash,
    select: res => res.body.todos,
  })
