import { route } from '@/server/lib/http'
import { clearCompleted } from '@/server/controllers/todo.controller'

// A static segment wins over [id] in the App Router, so /todos/completed
// never reaches the [id] handlers.
export const DELETE = route(clearCompleted)
