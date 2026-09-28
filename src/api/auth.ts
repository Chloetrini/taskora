import { api } from '@/api/client'
import type { LoginInput, RegisterInput, User } from '@/types/user'

export const getMe = () => api.get<User>('/auth/me')
export const login = (data: LoginInput) => api.post<User>('/auth/login', data)
export const register = (data: RegisterInput) => api.post<User>('/auth/register', data)
export const logout = () => api.post<undefined>('/auth/logout')
