import { useQueries } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import { stockApi } from './stockApi'

export function useStockBalances(storeId?: string | number, variantIds: number[] = []) {
  const normalizedStoreId = Number(storeId)
  const validStoreId = Number.isInteger(normalizedStoreId) && normalizedStoreId > 0
    ? normalizedStoreId
    : undefined

  const uniqueVariantIds = [...new Set(variantIds.filter((id) => Number.isInteger(id) && id > 0))]

  return useQueries({
    queries: uniqueVariantIds.map((variantId) => ({
      queryKey: ['stock-balance', { storeId: validStoreId, variantId }],
      queryFn: () => stockApi.getBalance(validStoreId!, variantId),
      enabled: Boolean(validStoreId),
      staleTime: 15 * 1000,
      retry: (failureCount: number, error: unknown) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) return false
        return failureCount < 1
      },
    })),
  })
}
