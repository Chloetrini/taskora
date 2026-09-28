import { route } from '@/server/lib/http'
import { createTodo, listTodos } from '@/server/controllers/todo.controller'

export const GET = route(listTodos)
export const POST = route(createTodo)
