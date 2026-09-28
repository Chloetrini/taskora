import type { Metadata } from 'next'
import NewTaskView from '@/views/new-task-view'

export const metadata: Metadata = { title: 'New task' }

export default function NewTaskPage() {
  return <NewTaskView />
}
