import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { userApi } from './userApi'
import type { CreateUserPayload, UpdateUserPayload } from './types'

export const userQueryKeys = {
  all: ['users'] as const,
  list: () => [...userQueryKeys.all, 'list'] as const,
  detail: (id: number) => [...userQueryKeys.all, 'detail', id] as const,
}

export function useUsers() {
  const { user } = useAuth()
  const businessId = Number(user?.business.id)
  return useQuery({
    queryKey: [...userQueryKeys.list(), businessId],
    queryFn: () => userApi.getUsers(businessId),
    enabled: Number.isFinite(businessId) && businessId > 0,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => userApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      userApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const businessId = Number(user?.business.id)
  return useMutation({
    mutationFn: (id: number) => userApi.deleteUser(id, businessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
    },
  })
}
