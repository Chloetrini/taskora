import type { Metadata } from 'next'
import EditTaskView from '@/views/edit-task-view'

export const metadata: Metadata = { title: 'Edit task' }

export default function EditTaskPage() {
  return <EditTaskView />
}
