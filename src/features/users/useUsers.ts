import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userApi } from './userApi'
import type { CreateUserPayload, UpdateUserPayload } from './types'

export const userQueryKeys = {
  all: ['users'] as const,
  list: () => [...userQueryKeys.all, 'list'] as const,
  detail: (id: number) => [...userQueryKeys.all, 'detail', id] as const,
  roles: () => [...userQueryKeys.all, 'roles'] as const,
  roleDetail: (id: number) => [...userQueryKeys.roles(), 'detail', id] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: userQueryKeys.list(),
    queryFn: () => userApi.getUsers(),
  })
}

export function useUserRoles() {
  return useQuery({
    queryKey: userQueryKeys.roles(),
    queryFn: () => userApi.getRoles(),
  })
}

export function useRoleDetails(roleId: number | null) {
  return useQuery({
    queryKey: userQueryKeys.roleDetail(roleId ?? 0),
    queryFn: () => userApi.getRoleDetails(roleId as number),
    enabled: roleId !== null,
    staleTime: 5 * 60 * 1000,
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
  return useMutation({
    mutationFn: (id: number) => userApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
    },
  })
}
