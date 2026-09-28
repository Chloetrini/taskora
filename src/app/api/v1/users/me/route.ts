import { route } from '@/server/lib/http'
import { deleteAccount, updateProfile } from '@/server/controllers/user.controller'

export const PATCH = route(updateProfile)
export const DELETE = route(deleteAccount)
