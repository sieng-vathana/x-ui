import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import { orderApi } from './orderApi'

function normalizeStoreId(storeId?: string | number): number | undefined {
  const numericId = Number(storeId)
  return Number.isInteger(numericId) && numericId > 0 ? numericId : undefined
}

export function useRecentOrders(storeId?: string | number, enabled = true, page = 0, size = 20) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['orders', 'recent', { storeId: normalizedStoreId, page, size }],
    queryFn: () => {
      if (normalizedStoreId === undefined) {
        throw new Error('A valid store must be selected before loading orders.')
      }
      return orderApi.list(normalizedStoreId, page, size)
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

export function useSalesSummary(storeId: string | number | undefined, from: string, to: string, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['reports', 'sales-summary', { storeId: normalizedStoreId, from, to }],
    queryFn: () => {
      if (normalizedStoreId === undefined) throw new Error('A valid store must be selected before loading reports.')
      return orderApi.salesSummary(normalizedStoreId, from, to)
    },
    enabled: enabled && normalizedStoreId !== undefined && Boolean(from) && Boolean(to),
    staleTime: 30 * 1000,
  })
}

export function useSalesTrend(storeId: string | number | undefined, from: string, to: string, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['reports', 'sales-trend', { storeId: normalizedStoreId, from, to }],
    queryFn: () => {
      if (normalizedStoreId === undefined) throw new Error('A valid store must be selected before loading reports.')
      return orderApi.salesTrend(normalizedStoreId, from, to)
    },
    enabled: enabled && normalizedStoreId !== undefined && Boolean(from) && Boolean(to),
    staleTime: 30 * 1000,
  })
}

export function useTopProducts(storeId: string | number | undefined, from: string, to: string, limit = 10, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['reports', 'top-products', { storeId: normalizedStoreId, from, to, limit }],
    queryFn: () => {
      if (normalizedStoreId === undefined) throw new Error('A valid store must be selected before loading reports.')
      return orderApi.topProducts(normalizedStoreId, from, to, limit)
    },
    enabled: enabled && normalizedStoreId !== undefined && Boolean(from) && Boolean(to),
    staleTime: 30 * 1000,
  })
}

export function useHeldOrders(storeId?: string | number, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['orders', 'held', { storeId: normalizedStoreId }],
    queryFn: () => {
      if (normalizedStoreId === undefined) {
        throw new Error('A valid store must be selected before loading held sales.')
      }
      return orderApi.listHeld(normalizedStoreId)
    },
    enabled: enabled && normalizedStoreId !== undefined,
    staleTime: 10 * 1000,
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

export function useCreateHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderApi.createHeld,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', 'held'] }),
  })
}

export function useResumeHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderApi.resumeHeld,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', 'held'] }),
  })
}

export function useDiscardHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderApi.discardHeld,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', 'held'] }),
  })
}

export function useCompleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: orderApi.complete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', 'recent'] }),
  })
}
