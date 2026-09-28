import { route } from '@/server/lib/http'
import { deleteTodo, getTodo, updateTodo } from '@/server/controllers/todo.controller'

type Params = { id: string }

export const GET = route<Params>(async (req, { params }) => getTodo(req, (await params).id))
export const PATCH = route<Params>(async (req, { params }) => updateTodo(req, (await params).id))
export const DELETE = route<Params>(async (req, { params }) => deleteTodo(req, (await params).id))
