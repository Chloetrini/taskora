'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TODO_CATEGORIES, TODO_DUE_FILTERS, TODO_PRIORITIES, TODO_SORTS, TODO_STATUSES } from '@/constants/todo-values'
import type { TodoFilters } from '@/types/todo'

export type FilterKey = 'status' | 'sort' | 'priority' | 'category' | 'tag' | 'due' | 'q'

const DEFAULTS: Partial<Record<FilterKey, string>> = { status: 'all', sort: 'newest', due: 'any' }

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback
const optional = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  allowed.includes(value as T) ? (value as T) : undefined

/**
 * All list filters live in the URL (?status=active&category=work&due=today)
 * so a refresh or shared link keeps the view. Unknown values fall back to
 * defaults; defaults are removed from the URL to keep it clean.
 * Pages using this must render inside <Suspense> (Next requirement for useSearchParams).
 */
export function useTodoFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters: TodoFilters = useMemo(
    () => ({
      status: pick(searchParams.get('status'), TODO_STATUSES, 'all'),
      sort: pick(searchParams.get('sort'), TODO_SORTS, 'newest'),
      due: pick(searchParams.get('due'), TODO_DUE_FILTERS, 'any'),
      priority: optional(searchParams.get('priority'), TODO_PRIORITIES),
      category: optional(searchParams.get('category'), TODO_CATEGORIES),
      tag: searchParams.get('tag')?.trim().toLowerCase() || undefined,
      search: searchParams.get('q')?.trim() || undefined,
    }),
    [searchParams]
  )

  const replaceParams = useCallback(
    (update: (params: URLSearchParams) => URLSearchParams) => {
      // Read the live URL, not a stale render's params, so rapid changes don't clobber each other.
      const next = update(new URLSearchParams(window.location.search))
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname]
  )

  const setFilter = useCallback(
    (key: FilterKey, value: string | undefined) =>
      replaceParams(params => {
        if (!value || DEFAULTS[key] === value) params.delete(key)
        else params.set(key, value)
        return params
      }),
    [replaceParams]
  )

  const clearFilters = useCallback(
    () =>
      replaceParams(params => {
        const next = new URLSearchParams()
        const status = params.get('status')
        if (status) next.set('status', status) // keep the tab
        return next
      }),
    [replaceParams]
  )

  const activeFilterCount = [filters.priority, filters.category, filters.tag, filters.search, filters.due !== 'any' ? filters.due : undefined].filter(Boolean).length

  return { filters, setFilter, clearFilters, activeFilterCount }
}
