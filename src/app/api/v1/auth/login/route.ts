import { route } from '@/server/lib/http'
import { login } from '@/server/controllers/auth.controller'

export const POST = route(login)
