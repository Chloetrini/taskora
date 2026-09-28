import { api } from '@/api/client'
import type { UpdateProfileInput, User, UsernameAvailability } from '@/types/user'

export const checkUsername = (username: string) =>
  api.get<UsernameAvailability>(`/users/username-available?username=${encodeURIComponent(username)}`)

export const updateProfile = (data: UpdateProfileInput) => api.patch<User>('/users/me', data)

export const changePassword = (data: { currentPassword?: string; newPassword: string }) =>
  api.patch<undefined>('/users/me/password', data)

/** Password accounts confirm with `password`; Google-only accounts with `confirmUsername`. */
export const deleteAccount = (confirm: { password?: string; confirmUsername?: string }) => api.delete<undefined>('/users/me', confirm)

/** The image must already be cropped square (see lib/crop-image.ts); the server checks the real type and size. */
export const uploadAvatar = (image: Blob) => api.upload<User>('/users/me/avatar', image)

export const removeAvatar = () => api.delete<User>('/users/me/avatar')
