import { route } from '@/server/lib/http'
import { register } from '@/server/controllers/auth.controller'

export const POST = route(register)
