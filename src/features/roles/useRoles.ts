import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { roleApi } from './roleApi'
import type { RolePayload } from './types'

export const roleQueryKeys = {
  all: ['roles'] as const,
  list: (businessId: number) => ['roles', 'list', businessId] as const,
  permissions: (businessId: number) => ['roles', 'permissions', businessId] as const,
  details: (businessId: number, roleId: number) => ['roles', 'details', businessId, roleId] as const,
}

function useBusinessId() {
  const { user } = useAuth()
  return Number(user?.business.id)
}

export function useRoles() {
  const businessId = useBusinessId()
  return useQuery({
    queryKey: roleQueryKeys.list(businessId),
    queryFn: () => roleApi.list(businessId),
    enabled: businessId > 0,
  })
}

export function usePermissionCatalog() {
  const businessId = useBusinessId()
  return useQuery({
    queryKey: roleQueryKeys.permissions(businessId),
    queryFn: () => roleApi.permissions(businessId),
    enabled: businessId > 0,
    staleTime: 10 * 60 * 1000,
  })
}

export function useRoleDetails(roleId: number | null) {
  const businessId = useBusinessId()
  return useQuery({
    queryKey: roleQueryKeys.details(businessId, roleId ?? 0),
    queryFn: () => roleApi.details(roleId as number, businessId),
    enabled: businessId > 0 && roleId !== null,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RolePayload) => roleApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleQueryKeys.all }),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RolePayload }) => roleApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleQueryKeys.all }),
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  const businessId = useBusinessId()
  return useMutation({
    mutationFn: (id: number) => roleApi.remove(id, businessId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleQueryKeys.all }),
  })
}
