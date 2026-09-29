import { api } from '@/api/client'
import type { LoginInput, RegisterInput, RegisterResult, User } from '@/types/user'

export const getMe = () => api.get<User>('/auth/me')
export const login = (data: LoginInput) => api.post<User>('/auth/login', data)
export const register = (data: RegisterInput) => api.post<RegisterResult>('/auth/register', data)
export const logout = () => api.post<undefined>('/auth/logout')

export const verifyEmail = (token: string) => api.post<{ email: string }>('/auth/verify-email', { token })
/** `identifier` is an email or a username; the answer is the same whether or not it exists. */
export const resendVerification = (identifier: string) => api.post<undefined>('/auth/resend-verification', { identifier })
export const forgotPassword = (email: string) => api.post<undefined>('/auth/forgot-password', { email })
export const resetPassword = (data: { token: string; newPassword: string }) => api.post<undefined>('/auth/reset-password', data)
