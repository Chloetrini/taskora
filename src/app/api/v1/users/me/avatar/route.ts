import { route } from '@/server/lib/http'
import { getAvatar, removeAvatar, uploadAvatar } from '@/server/controllers/avatar.controller'

export const GET = route(getAvatar)
export const PUT = route(uploadAvatar)
export const DELETE = route(removeAvatar)
