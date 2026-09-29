import { route } from '@/server/lib/http'
import { verifyEmail } from '@/server/controllers/email-auth.controller'

export const POST = route(verifyEmail)
