import { route } from '@/server/lib/http'
import { changePassword } from '@/server/controllers/user.controller'

export const PATCH = route(changePassword)
