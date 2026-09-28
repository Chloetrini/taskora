import { route } from '@/server/lib/http'
import { toggleSubtask } from '@/server/controllers/todo.controller'

type Params = { id: string; subtaskId: string }

export const PATCH = route<Params>(async (req, { params }) => {
  const { id, subtaskId } = await params
  return toggleSubtask(req, id, subtaskId)
})
