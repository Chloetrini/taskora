import { route } from '@/server/lib/http'
import { emptyTrash, listTrash } from '@/server/controllers/todo.controller'

// Static segment: /todos/trash never reaches the [id] handlers.
export const GET = route(listTrash)
export const DELETE = route(emptyTrash)
