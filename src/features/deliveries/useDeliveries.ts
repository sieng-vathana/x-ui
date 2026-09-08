import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import { deliveryApi } from './deliveryApi'
import type { DeliveryFilters } from './types'

export function useDeliveries(filters: DeliveryFilters, enabled = true) {
  return useQuery({
    queryKey: ['deliveries', 'list', filters],
    queryFn: () => deliveryApi.list(filters),
    enabled: enabled && Boolean(filters.storeId || filters.orderId),
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
      return failureCount < 1
    },
  })
}

export function useDelivery(id?: number, enabled = true) {
  return useQuery({
    queryKey: ['deliveries', 'detail', id],
    queryFn: () => {
      if (!id) throw new Error('Delivery ID is required.')
      return deliveryApi.get(id)
    },
    enabled: enabled && Boolean(id && id > 0),
    staleTime: 10 * 1000,
  })
}

export function useDeliveryForOrder(orderId?: number, enabled = true) {
  return useQuery({
    queryKey: ['deliveries', 'for-order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required.')
      const res = await deliveryApi.list({ orderId, page: 0, size: 1 })
      return res.content[0] ?? null
    },
    enabled: enabled && Boolean(orderId && orderId > 0),
    staleTime: 10 * 1000,
  })
}

export function useCreateDeliveryQuotes() {
  return useMutation({
    mutationFn: deliveryApi.createQuotes,
  })
}

export function useCreateDelivery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deliveryApi.createDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deliveryApi.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useRecordDeliveryRemittance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deliveryApi.recordRemittance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
