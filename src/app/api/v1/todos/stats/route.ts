import { route } from '@/server/lib/http'
import { getStats } from '@/server/controllers/todo.controller'

export const GET = route(getStats)
