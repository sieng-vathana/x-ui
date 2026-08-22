import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import {
  StockBalance,
  StockChangeInput,
  StockMovementFilters,
  StockMovementType,
  stockApi,
} from './stockApi'

export interface StockMovementQueryOptions {
  storeId?: string | number
  variantId?: string | number
  movementType?: StockMovementType
  from?: string
  to?: string
  page?: number
  size?: number
  enabled?: boolean
}

function shouldRetryStockQuery(failureCount: number, error: unknown) {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
    return false
  }
  return failureCount < 1
}

export function useStockMovements(options: StockMovementQueryOptions = {}) {
  const normalizedStoreId = Number(options.storeId)
  const validStoreId = Number.isInteger(normalizedStoreId) && normalizedStoreId > 0
    ? normalizedStoreId
    : undefined

  const normalizedVariantId = options.variantId === undefined || options.variantId === ''
    ? undefined
    : Number(options.variantId)
  const validVariantId = normalizedVariantId !== undefined
    && Number.isInteger(normalizedVariantId)
    && normalizedVariantId > 0
    ? normalizedVariantId
    : undefined

  const filters: StockMovementFilters = {
    storeId: validStoreId ?? 0,
    ...(validVariantId !== undefined ? { variantId: validVariantId } : {}),
    ...(options.movementType ? { movementType: options.movementType } : {}),
    ...(options.from ? { from: options.from } : {}),
    ...(options.to ? { to: options.to } : {}),
    ...(options.page !== undefined ? { page: options.page } : {}),
    ...(options.size !== undefined ? { size: options.size } : {}),
  }

  return useQuery({
    queryKey: ['stock-movements', filters],
    queryFn: () => stockApi.listMovements(filters),
    enabled: (options.enabled ?? true) && Boolean(validStoreId),
    staleTime: 15 * 1000,
    retry: shouldRetryStockQuery,
  })
}

function useStockChange(mutationFn: (input: StockChangeInput) => Promise<StockBalance>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
      ])
    },
  })
}

export function useStockIn() {
  return useStockChange((input) => stockApi.stockIn(input))
}

export function useStockOut() {
  return useStockChange((input) => stockApi.stockOut(input))
}
