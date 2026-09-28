import { route } from '@/server/lib/http'
import { logout } from '@/server/controllers/auth.controller'

export const POST = route(logout)
