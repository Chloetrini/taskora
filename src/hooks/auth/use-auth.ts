import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMe, login, logout, register } from '@/api/auth'
import { ApiError } from '@/api/client'
import type { LoginInput, RegisterInput, User } from '@/types/user'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

/**
 * The signed-in user, or null when signed out. A 401 is a normal answer
 * ("not logged in"), not an error, so it resolves to null instead of throwing.
 */
export const useMe = () =>
  useQuery({
    queryKey: authKeys.me,
    queryFn: async (): Promise<User | null> => {
      try {
        return (await getMe()).body
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

export const useLogin = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: LoginInput) => login(data),
    onSuccess: res => {
      // A different person may have used this browser — drop their cached data.
      queryClient.removeQueries({ predicate: q => q.queryKey[0] !== 'auth' })
      queryClient.setQueryData(authKeys.me, res.body)
    },
  })
}

export const useRegister = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: RegisterInput) => register(data),
    onSuccess: res => {
      queryClient.removeQueries({ predicate: q => q.queryKey[0] !== 'auth' })
      queryClient.setQueryData(authKeys.me, res.body)
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.me, null)
    },
  })
}
