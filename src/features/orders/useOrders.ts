import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import { orderApi } from './orderApi'

function normalizeStoreId(storeId?: string | number): number | undefined {
  const numericId = Number(storeId)
  return Number.isInteger(numericId) && numericId > 0 ? numericId : undefined
}

export function useRecentOrders(storeId?: string | number, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['orders', 'recent', { storeId: normalizedStoreId }],
    queryFn: () => {
      if (normalizedStoreId === undefined) {
        throw new Error('A valid store must be selected before loading orders.')
      }
      return orderApi.list(normalizedStoreId)
    },
    enabled: enabled && normalizedStoreId !== undefined,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useCreatePosOrder() {
  return useMutation({ mutationFn: orderApi.createPos })
}

export function useCompleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: orderApi.complete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', 'recent'] }),
  })
}
