import { route } from '@/server/lib/http'
import { forgotPassword } from '@/server/controllers/email-auth.controller'

export const POST = route(forgotPassword)
