'use client'

import { useRef, useState } from 'react'
import { Database, Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDismiss } from '@/hooks/shared/use-dismiss'
import { useClearAllData, useLoadSampleData } from '@/hooks/todos/use-todo-actions'

/** One click to fill the app with example tasks, and one (confirmed) to get back to empty. */
export default function SampleDataControls() {
  const load = useLoadSampleData()
  const clear = useClearAllData()
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, confirming, () => setConfirming(false))

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => load.mutate()} disabled={load.isPending}>
        <Database /> Load sample data
      </Button>
      {confirming ? (
        <span className="flex items-center gap-2 text-sm">
          Delete every task, including the trash?
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/50 text-destructive"
            onClick={() => clear.mutate(undefined, { onSettled: () => setConfirming(false) })}
            disabled={clear.isPending}
          >
            Clear all data
          </Button>
        </span>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          <Eraser /> Clear all data
        </Button>
      )}
    </div>
  )
}
