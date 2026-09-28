import { Suspense } from 'react'
import type { Metadata } from 'next'
import TasksView from '@/views/tasks-view'
import TodosSkeleton from '@/components/skeletons/todos-skeleton'

export const metadata: Metadata = { title: 'All tasks' }

export default function TasksPage() {
  return (
    // useSearchParams (filters live in the URL) needs a Suspense boundary.
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 sm:px-6"><TodosSkeleton /></div>}>
      <TasksView />
    </Suspense>
  )
}
