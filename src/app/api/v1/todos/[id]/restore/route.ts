import { route } from '@/server/lib/http'
import { restoreTodo } from '@/server/controllers/todo.controller'

export const POST = route<{ id: string }>(async (req, { params }) => restoreTodo(req, (await params).id))
