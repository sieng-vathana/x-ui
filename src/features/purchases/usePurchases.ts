import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { purchaseApi } from './purchaseApi'
import type { PurchaseOrderInput, SupplierInput, SupplierReturnInput } from './types'

function useBusinessId(): number {
  const { user } = useAuth()
  const businessId = Number(user?.business.id)
  return Number.isInteger(businessId) && businessId > 0 ? businessId : 0
}

export const purchaseKeys = {
  all: ['purchases'] as const,
  suppliers: (businessId: number) => ['purchases', 'suppliers', businessId] as const,
  orders: (businessId: number, storeId?: number) => ['purchases', 'orders', businessId, storeId ?? 'all'] as const,
  order: (businessId: number, id: number) => ['purchases', 'order', businessId, id] as const,
  returns: (businessId: number, storeId?: number) => ['purchases', 'returns', businessId, storeId ?? 'all'] as const,
}

export function useSuppliers() {
  const businessId = useBusinessId()
  return useQuery({
    queryKey: purchaseKeys.suppliers(businessId),
    queryFn: () => purchaseApi.suppliers(businessId),
    enabled: businessId > 0,
  })
}

export function usePurchaseOrders(storeId?: number) {
  const businessId = useBusinessId()
  return useQuery({
    queryKey: purchaseKeys.orders(businessId, storeId),
    queryFn: () => purchaseApi.orders(businessId, storeId),
    enabled: businessId > 0,
  })
}

export function usePurchaseOrder(id: number | undefined) {
  const businessId = useBusinessId()
  return useQuery({
    queryKey: purchaseKeys.order(businessId, id ?? 0),
    queryFn: () => purchaseApi.order(businessId, id!),
    enabled: businessId > 0 && Boolean(id),
  })
}

export function useSupplierReturns(storeId?: number) {
  const businessId = useBusinessId()
  return useQuery({
    queryKey: purchaseKeys.returns(businessId, storeId),
    queryFn: () => purchaseApi.returns(businessId, storeId),
    enabled: businessId > 0,
  })
}

/** Every change refreshes purchases, and stock and product suppliers that depend on them. */
function useRefresh() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: purchaseKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['product-suppliers'] })
    void queryClient.invalidateQueries({ queryKey: ['stock-balance'] })
    void queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    void queryClient.invalidateQueries({ queryKey: ['stock-low'] })
  }
}

export function useSaveSupplier() {
  const businessId = useBusinessId()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Omit<SupplierInput, 'businessId'> }) => (id
      ? purchaseApi.updateSupplier(id, { ...input, businessId })
      : purchaseApi.createSupplier({ ...input, businessId })),
    onSuccess: refresh,
  })
}

export function useSavePurchaseOrder() {
  const businessId = useBusinessId()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Omit<PurchaseOrderInput, 'businessId'> }) => (id
      ? purchaseApi.updateOrder(id, { ...input, businessId })
      : purchaseApi.createOrder({ ...input, businessId })),
    onSuccess: refresh,
  })
}

export function usePurchaseOrderAction() {
  const businessId = useBusinessId()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'place' | 'close' | 'cancel' }) => purchaseApi.orderAction(businessId, id, action),
    onSuccess: refresh,
  })
}

export function useReceivePurchaseOrder() {
  const businessId = useBusinessId()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, lines, note }: { id: number; lines: Array<{ lineId: number; quantity: number }>; note?: string }) =>
      purchaseApi.receive(businessId, id, lines, note),
    onSuccess: refresh,
  })
}

export function useCreateSupplierReturn() {
  const businessId = useBusinessId()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: Omit<SupplierReturnInput, 'businessId'>) => purchaseApi.createReturn({ ...input, businessId }),
    onSuccess: refresh,
  })
}

export function useSupplierReturnAction() {
  const businessId = useBusinessId()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'complete' | 'cancel' }) => purchaseApi.returnAction(businessId, id, action),
    onSuccess: refresh,
  })
}
