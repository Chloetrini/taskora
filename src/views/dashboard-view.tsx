'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import PageWrapper from '@/components/layout/page-wrapper'
import TodoList from '@/components/todos/todo-list'
import QuickAdd from '@/components/todos/quick-add'
import TodosSkeleton from '@/components/skeletons/todos-skeleton'
import { CATEGORIES, CATEGORY_META } from '@/constants/todo'
import SampleDataControls from '@/components/todos/sample-data-controls'
import { useTodos, useTodoStats } from '@/hooks/todos/use-todos'
import { greeting } from '@/lib/utils'
import type { TodoFilters } from '@/types/todo'

const DUE_TODAY: TodoFilters = { status: 'active', due: 'today', sort: 'priority' }
const OVERDUE: TodoFilters = { status: 'active', due: 'overdue', sort: 'due' }
const UP_NEXT: TodoFilters = { status: 'active', due: 'any', sort: 'newest' }

function Stat({ label, value, to, tone }: { label: string; value: number | string; to: string; tone?: string }) {
  return (
    <Link href={to} className="group rounded-lg px-1 py-2 transition-colors">
      <p className={`font-display text-4xl font-bold tabular-nums tracking-tight ${tone ?? ''}`}>{value}</p>
      <p className="mt-1 text-sm text-muted-foreground group-hover:text-foreground">{label}</p>
    </Link>
  )
}

function Section({ title, to, children }: { title: string; to: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
        <Link href={to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          See all <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  )
}

export default function DashboardView() {
  const stats = useTodoStats()
  const dueToday = useTodos(DUE_TODAY)
  const overdue = useTodos(OVERDUE)
  const allActive = useTodos(UP_NEXT)
  const s = stats.data
  // Everything else still to do, minus what's already shown above it.
  const shownIds = new Set([...(overdue.data?.todos ?? []), ...(dueToday.data?.todos ?? [])].map(t => t._id))
  const upNext = (allActive.data?.todos ?? []).filter(t => !shownIds.has(t._id)).slice(0, 6)

  const maxCategory = s ? Math.max(1, ...CATEGORIES.map(c => s.byCategory[c] ?? 0)) : 1

  return (
    <PageWrapper size="wide">
      {/* The signature moment: today's weekday as the headline. */}
      <h1 className="font-display text-[clamp(2.75rem,11vw,4.5rem)] leading-[0.95] font-extrabold tracking-[-0.035em]">{format(new Date(), 'EEEE')}</h1>
      <p className="mt-2 font-display text-xl font-medium tracking-tight text-muted-foreground sm:text-2xl">{format(new Date(), 'd MMMM yyyy')}</p>
      <p className="mt-4 text-[15px]">
        {greeting()}.
      </p>
      <div className="mt-4">
        <SampleDataControls />
      </div>

      <div className="mt-8">
        <div className="flex items-baseline justify-between text-sm">
          <p className="font-medium" aria-live="polite">
            {!s ? 'Loading…' : s.total === 0 ? 'No tasks yet' : s.active === 0 ? `All ${s.total} tasks done` : `${s.completed} of ${s.total} tasks done`}
          </p>
          {s && s.total > 0 && <p className="tabular-nums text-muted-foreground">{s.completionRate}%</p>}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Tasks completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s?.completionRate ?? 0}>
          <div className="h-full rounded-full bg-done transition-[width] duration-500 ease-out" style={{ width: `${s?.completionRate ?? 0}%` }} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-y border-border py-4 sm:grid-cols-4">
        <Stat label="To do" value={s?.active ?? '–'} to="/tasks?status=active" />
        <Stat label="Due today" value={s?.dueToday ?? '–'} to="/tasks?status=active&due=today" tone="text-primary" />
        <Stat label="Overdue" value={s?.overdue ?? '–'} to="/tasks?status=active&due=overdue" tone={s?.overdue ? 'text-destructive' : ''} />
        <Stat label="Done this week" value={s?.completedThisWeek ?? '–'} to="/tasks?status=completed" tone="text-done" />
      </div>

      <div className="mt-8">
        <QuickAdd />
      </div>

      {overdue.data && overdue.data.todos.length > 0 && (
        <Section title="Overdue" to="/tasks?status=active&due=overdue">
          <TodoList todos={overdue.data.todos.slice(0, 5)} label="Overdue tasks" />
        </Section>
      )}

      <Section title="Due today" to="/tasks?status=active&due=today">
        {dueToday.isPending ? (
          <TodosSkeleton />
        ) : dueToday.data && dueToday.data.todos.length > 0 ? (
          <TodoList todos={dueToday.data.todos.slice(0, 8)} label="Tasks due today" />
        ) : (
          <p className="rounded-lg border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">Nothing due today. Give a task a due date to see it here.</p>
        )}
      </Section>

      {upNext.length > 0 && (
        <Section title="Up next" to="/tasks?status=active">
          <TodoList todos={upNext} label="Up next" />
        </Section>
      )}

      {s && s.active > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Still to do, by category</h2>
          <ul className="grid gap-3">
            {CATEGORIES.filter(c => (s.byCategory[c] ?? 0) > 0).map(c => {
              const Icon = CATEGORY_META[c].icon
              const count = s.byCategory[c]
              return (
                <li key={c}>
                  <Link href={`/tasks?status=active&category=${c}`} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm hover:text-primary">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      {CATEGORY_META[c].label}
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-border">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${(count / maxCategory) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground">{count}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </PageWrapper>
  )
}
