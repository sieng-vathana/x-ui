import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import { customerApi } from './customerApi'
import type { CustomerPayload } from './types'

export const customerQueryKeys = {
  list: (businessId: number) => ['customers', 'list', businessId] as const,
}

function useBusinessId() {
  const { user } = useAuth()
  return Number(user?.business.id)
}

export function useCustomers() {
  const businessId = useBusinessId()
  return useQuery({
    queryKey: customerQueryKeys.list(businessId),
    queryFn: () => customerApi.list(businessId),
    enabled: businessId > 0,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CustomerPayload) => customerApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CustomerPayload }) => customerApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useDeactivateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, businessId }: { id: number; businessId: number }) => customerApi.deactivate(id, businessId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}
