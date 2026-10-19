import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import { orderApi } from './orderApi'
import type { ReportBucket } from './types'

function normalizeStoreId(storeId?: string | number): number | undefined {
  const numericId = Number(storeId)
  return Number.isInteger(numericId) && numericId > 0 ? numericId : undefined
}

export function useRecentOrders(
  filtersOrStoreId?: string | number | { storeId?: string | number; channel?: string; status?: string; fulfillmentType?: string; search?: string; page?: number; size?: number },
  enabled = true,
  page = 0,
  size = 20,
) {
  const isObject = typeof filtersOrStoreId === 'object' && filtersOrStoreId !== null
  const storeId = isObject ? filtersOrStoreId.storeId : filtersOrStoreId
  const normalizedStoreId = normalizeStoreId(storeId)
  const channel = isObject ? filtersOrStoreId.channel : undefined
  const status = isObject ? filtersOrStoreId.status : undefined
  const fulfillmentType = isObject ? filtersOrStoreId.fulfillmentType : undefined
  const search = isObject ? filtersOrStoreId.search : undefined
  const pageNumber = isObject ? (filtersOrStoreId.page ?? 0) : page
  const pageSize = isObject ? (filtersOrStoreId.size ?? 20) : size

  return useQuery({
    queryKey: ['orders', 'recent', { storeId: normalizedStoreId, channel, status, fulfillmentType, search, page: pageNumber, size: pageSize }],
    queryFn: () => {
      if (normalizedStoreId === undefined) {
        throw new Error('A valid store must be selected before loading orders.')
      }
      return orderApi.list({
        storeId: normalizedStoreId,
        channel,
        status,
        fulfillmentType,
        search,
        page: pageNumber,
        size: pageSize,
      })
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

export function useOrder(id?: number, enabled = true) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => {
      if (!id) throw new Error('Order ID is required.')
      return orderApi.get(id)
    },
    enabled: enabled && Boolean(id && id > 0),
    staleTime: 10 * 1000,
  })
}

export function useSalesSummary(storeId: string | number | undefined, from: string, to: string, currencyCode: string, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['reports', 'sales-summary', { storeId: normalizedStoreId, from, to, currencyCode }],
    queryFn: () => {
      if (normalizedStoreId === undefined) throw new Error('A valid store must be selected before loading reports.')
      return orderApi.salesSummary(normalizedStoreId, from, to, currencyCode)
    },
    enabled: enabled && normalizedStoreId !== undefined && Boolean(from) && Boolean(to),
    staleTime: 30 * 1000,
  })
}

export function useSalesTrend(storeId: string | number | undefined, from: string, to: string, currencyCode: string, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['reports', 'sales-trend', { storeId: normalizedStoreId, from, to, currencyCode }],
    queryFn: () => {
      if (normalizedStoreId === undefined) throw new Error('A valid store must be selected before loading reports.')
      return orderApi.salesTrend(normalizedStoreId, from, to, currencyCode)
    },
    enabled: enabled && normalizedStoreId !== undefined && Boolean(from) && Boolean(to),
    staleTime: 30 * 1000,
  })
}

export function useTopProducts(storeId: string | number | undefined, from: string, to: string, currencyCode: string, limit = 10, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['reports', 'top-products', { storeId: normalizedStoreId, from, to, currencyCode, limit }],
    queryFn: () => {
      if (normalizedStoreId === undefined) throw new Error('A valid store must be selected before loading reports.')
      return orderApi.topProducts(normalizedStoreId, from, to, currencyCode, limit)
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

export function useConfirmOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderApi.confirm,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function usePackOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderApi.pack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useShipOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderApi.ship,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
    },
  })
}

export function useDeliverOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderApi.deliver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: orderApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
    },
  })
}

export function useCompleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: orderApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
    },
  })
}

export function useSalesBreakdown(storeId: string | number | undefined, from: string, to: string, currencyCode: string, bucket: ReportBucket, enabled = true) {
  const normalizedStoreId = normalizeStoreId(storeId)

  return useQuery({
    queryKey: ['reports', 'sales-breakdown', { storeId: normalizedStoreId, from, to, currencyCode, bucket }],
    queryFn: () => {
      if (normalizedStoreId === undefined) throw new Error('A valid store must be selected before loading reports.')
      return orderApi.salesBreakdown(normalizedStoreId, from, to, currencyCode, bucket)
    },
    enabled: enabled && normalizedStoreId !== undefined && Boolean(from) && Boolean(to),
    staleTime: 30 * 1000,
  })
}
