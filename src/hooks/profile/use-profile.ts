import { useMutation, useQueryClient } from '@tanstack/react-query'
import { changePassword, deleteAccount, removeAvatar, updateProfile, uploadAvatar } from '@/api/users'
import { authKeys } from '@/hooks/auth/use-auth'
import type { UpdateProfileInput } from '@/types/user'

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateProfileInput) => updateProfile(data),
    onSuccess: res => queryClient.setQueryData(authKeys.me, res.body),
  })
}

export const useUploadAvatar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (image: Blob) => uploadAvatar(image),
    onSuccess: res => queryClient.setQueryData(authKeys.me, res.body),
  })
}

export const useRemoveAvatar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removeAvatar(),
    onSuccess: res => queryClient.setQueryData(authKeys.me, res.body),
  })
}

export const useChangePassword = () =>
  useMutation({
    mutationFn: (data: { currentPassword?: string; newPassword: string }) => changePassword(data),
  })

export const useDeleteAccount = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (confirm: { password?: string; confirmUsername?: string }) => deleteAccount(confirm),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.me, null)
    },
  })
}
