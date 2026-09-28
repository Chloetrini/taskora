import type { Metadata } from 'next'
import TrashView from '@/views/trash-view'

export const metadata: Metadata = { title: 'Trash' }

export default function TrashPage() {
  return <TrashView />
}
