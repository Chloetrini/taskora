import { route } from '@/server/lib/http'
import { deleteTodoForever } from '@/server/controllers/todo.controller'

export const DELETE = route<{ id: string }>(async (req, { params }) => deleteTodoForever(req, (await params).id))
