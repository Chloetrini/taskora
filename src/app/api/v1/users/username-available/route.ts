import { route } from '@/server/lib/http'
import { checkUsername } from '@/server/controllers/user.controller'

export const GET = route(checkUsername)
