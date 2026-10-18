import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import type {
  StockBalance,
  StockBalancePage,
  StockChangeInput,
  StockMovementFilters,
  StockMovementType,
  ExpiryBatchFilter,
  ExpiryWriteOffInput,
} from './stockApi'
import { stockApi } from './stockApi'

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

export function useLowStock(storeId?: string | number, threshold = 5, page = 0, size = 20, enabled = true) {
  const normalizedStoreId = Number(storeId)
  const validStoreId = Number.isInteger(normalizedStoreId) && normalizedStoreId > 0
    ? normalizedStoreId
    : undefined

  return useQuery<StockBalancePage>({
    queryKey: ['stock-low', { storeId: validStoreId, threshold, page, size }],
    queryFn: () => stockApi.lowStock(validStoreId!, threshold, page, size),
    enabled: enabled && Boolean(validStoreId),
    staleTime: 15 * 1000,
    retry: shouldRetryStockQuery,
  })
}

export function useExpiryBatches(storeId?: string | number, filter: ExpiryBatchFilter = 'ALL', page = 0, size = 25) {
  const normalizedStoreId = Number(storeId)
  const validStoreId = Number.isInteger(normalizedStoreId) && normalizedStoreId > 0 ? normalizedStoreId : undefined
  return useQuery({
    queryKey: ['stock-expiry-batches', { storeId: validStoreId, filter, page, size }],
    queryFn: () => stockApi.expiryBatches(validStoreId!, filter, page, size),
    enabled: Boolean(validStoreId),
    staleTime: 15 * 1000,
    retry: shouldRetryStockQuery,
  })
}

export function useExpirySummary(storeId?: string | number) {
  const normalizedStoreId = Number(storeId)
  const validStoreId = Number.isInteger(normalizedStoreId) && normalizedStoreId > 0 ? normalizedStoreId : undefined
  return useQuery({
    queryKey: ['stock-expiry-summary', validStoreId],
    queryFn: () => stockApi.expirySummary(validStoreId!),
    enabled: Boolean(validStoreId),
    staleTime: 15 * 1000,
    retry: shouldRetryStockQuery,
  })
}

export function useWriteOffExpiredBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ batchId, input }: { batchId: number; input: ExpiryWriteOffInput }) =>
      stockApi.writeOffExpiredBatch(batchId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-expiry-batches'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-expiry-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-low'] }),
      ])
    },
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
        queryClient.invalidateQueries({ queryKey: ['stock-low'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-expiry-batches'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-expiry-summary'] }),
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
