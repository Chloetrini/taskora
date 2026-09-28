'use client'

import { useEffect, useState } from 'react'
import { LayoutGrid, Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CATEGORIES, CATEGORY_META, DUE_OPTIONS, PRIORITIES, PRIORITY_META, SORT_OPTIONS, STATUS_TABS } from '@/constants/todo'
import { useDebouncedValue } from '@/hooks/shared/use-debounced-value'
import type { FilterKey } from '@/hooks/todos/use-todo-filters'
import type { TodoFilters, TodoStats, TodoStatus } from '@/types/todo'
import { cn } from '@/lib/utils'

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-primary-soft py-0.5 pr-1 pl-2 text-[13px] font-medium">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:text-foreground">
        <X className="size-3" />
      </button>
    </span>
  )
}

const countFor = (status: TodoStatus, stats?: TodoStats) =>
  !stats ? undefined : status === 'all' ? stats.total : status === 'active' ? stats.active : stats.completed

export default function TodoToolbar({
  filters,
  setFilter,
  clearFilters,
  stats,
}: {
  filters: TodoFilters
  setFilter: (key: FilterKey, value: string | undefined) => void
  clearFilters: () => void
  stats?: TodoStats
}) {
  const [searchText, setSearchText] = useState(filters.search ?? '')
  // The panel holds priority, due date and sort; category has its own tabs.
  const panelCount = [filters.priority, filters.due !== 'any' ? filters.due : undefined].filter(Boolean).length
  const chipCount = panelCount + (filters.tag ? 1 : 0) + (filters.search ? 1 : 0)
  const [showFilters, setShowFilters] = useState(panelCount > 0)
  const debouncedSearch = useDebouncedValue(searchText, 300)

  useEffect(() => {
    setFilter('q', debouncedSearch.trim() || undefined)
  }, [debouncedSearch, setFilter])

  return (
    <div className="grid gap-3">
      <div role="tablist" aria-label="Filter by status" className="flex gap-1 rounded-md bg-primary-soft/70 p-1">
        {STATUS_TABS.map(tab => {
          const selected = filters.status === tab.value
          const count = countFor(tab.value, stats)
          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setFilter('status', tab.value)}
              className={cn(
                'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm text-sm font-medium transition-colors',
                selected ? 'bg-surface text-foreground shadow-sm dark:bg-primary/25' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {count !== undefined && <span className="tabular-nums text-xs text-muted-foreground">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Category tabs — always visible, horizontally scrollable on small screens. */}
      <div role="tablist" aria-label="Filter by category" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[undefined, ...CATEGORIES].map(c => {
          const selected = filters.category === c
          const Icon = c ? CATEGORY_META[c].icon : LayoutGrid
          return (
            <button
              key={c ?? 'all'}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setFilter('category', c)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {c ? CATEGORY_META[c].label : 'All categories'}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="search-tasks" className="sr-only">
            Search tasks
          </label>
          <Input
            id="search-tasks"
            type="search"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search titles, notes and tags"
            className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchText && (
            <button type="button" onClick={() => setSearchText('')} aria-label="Clear search" className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button variant="outline" onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters} aria-controls="task-filters" className={cn(showFilters && 'bg-primary-soft')}>
          <SlidersHorizontal />
          <span className="hidden sm:inline">Filters</span>
          {panelCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{panelCount}</span>}
        </Button>
      </div>

      {showFilters && (
        <div id="task-filters" className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-3">
          <Select aria-label="Filter by priority" value={filters.priority ?? ''} onChange={e => setFilter('priority', e.target.value || undefined)}>
            <option value="">Any priority</option>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label} priority
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by due date" value={filters.due} onChange={e => setFilter('due', e.target.value)}>
            {DUE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select aria-label="Sort tasks" value={filters.sort} onChange={e => setFilter('sort', e.target.value)}>
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {chipCount > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {filters.tag && <FilterChip label={`#${filters.tag}`} onRemove={() => setFilter('tag', undefined)} />}
          {filters.priority && <FilterChip label={`${PRIORITY_META[filters.priority].label} priority`} onRemove={() => setFilter('priority', undefined)} />}
          {filters.due !== 'any' && <FilterChip label={DUE_OPTIONS.find(o => o.value === filters.due)?.label ?? filters.due} onRemove={() => setFilter('due', undefined)} />}
          {filters.search && <FilterChip label={`“${filters.search}”`} onRemove={() => setSearchText('')} />}
          <button
            type="button"
            onClick={() => {
              setSearchText('')
              clearFilters()
            }}
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
