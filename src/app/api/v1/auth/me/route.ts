import { route } from '@/server/lib/http'
import { me } from '@/server/controllers/auth.controller'

export const GET = route(me)
