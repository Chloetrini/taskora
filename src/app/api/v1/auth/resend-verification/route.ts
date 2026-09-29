import { route } from '@/server/lib/http'
import { resendVerification } from '@/server/controllers/email-auth.controller'

export const POST = route(resendVerification)
