import { route } from '@/server/lib/http'
import { resetPassword } from '@/server/controllers/email-auth.controller'

export const POST = route(resetPassword)
