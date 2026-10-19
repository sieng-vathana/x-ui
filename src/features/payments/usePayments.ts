import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import { paymentApi } from './paymentApi'
import type { ReportBucket } from '../orders/types'
import type { CashMovementInput, CloseCashSessionInput, RefundPaymentInput } from './types'

export function useCreateCashPayment() {
  return useMutation({ mutationFn: paymentApi.createCash })
}

export function useCreateCardPayment() {
  return useMutation({ mutationFn: paymentApi.createCard })
}

export function useCreateQrPayment() {
  return useMutation({ mutationFn: paymentApi.createQr })
}

export function useCreatePosQrCheckout() {
  return useMutation({ mutationFn: paymentApi.createPosQr })
}

export function useCreateSimulatedPosQrCheckout() {
  return useMutation({ mutationFn: paymentApi.createSimulatedPosQr })
}

export function useCreateBakongPosQrCheckout() {
  return useMutation({ mutationFn: paymentApi.createBakongPosQr })
}

/** How often a pending Bakong KHQR is checked; the sale completes within this long of the customer paying. */
const BAKONG_CHECK_INTERVAL_MS = 1500

/** While a Bakong KHQR is pending, asks Bakong every 1.5 seconds whether it has been paid. */
export function useBakongPaymentCheck(id: number | undefined, enabled: boolean) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['payment', id, 'bakong-check'],
    queryFn: async () => {
      const payment = await paymentApi.checkBakong(id!)
      queryClient.setQueryData(['payment', payment.id], payment)
      return payment
    },
    enabled: enabled && Boolean(id),
    refetchInterval: (query) => (
      query.state.status !== 'error' && query.state.data?.status === 'PENDING' ? BAKONG_CHECK_INTERVAL_MS : false
    ),
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 0,
  })
}

export function useConfirmPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: paymentApi.confirm,
    onSuccess: (payment) => {
      queryClient.setQueryData(['payment', payment.id], payment)
    },
  })
}

export function useSimulatePaymentCallback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: paymentApi.simulateCallback,
    retry: (failureCount, error) => (
      failureCount < 3
      && error instanceof ApiError
      && error.status === 409
      && error.message.toLowerCase().includes('not ready')
    ),
    retryDelay: 200,
    onSuccess: (payment) => {
      queryClient.setQueryData(['payment', payment.id], payment)
    },
  })
}

export function usePaymentsForOrder(orderId?: number) {
  return useQuery({
    queryKey: ['payments', { orderId }],
    queryFn: () => paymentApi.listForOrder(orderId!),
    enabled: Boolean(orderId),
  })
}

export function useRefundPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: RefundPaymentInput }) => paymentApi.refund(id, input),
    onSuccess: (payment) => {
      queryClient.setQueryData(['payment', payment.id], payment)
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'recent'] })
      queryClient.invalidateQueries({ queryKey: ['reports', 'payment-breakdown'] })
      queryClient.invalidateQueries({ queryKey: ['cash-session'] })
    },
  })
}

export function usePaymentBreakdown(storeId: string | number | undefined, from: string, to: string, currencyCode: string, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'payment-breakdown', { storeId, from, to, currencyCode }],
    queryFn: () => paymentApi.breakdown(storeId!, from, to, currencyCode),
    enabled: enabled && Boolean(storeId) && Boolean(from) && Boolean(to),
    staleTime: 30 * 1000,
  })
}

export function useCurrentCashSession(
  storeId: string | number | undefined,
  cashierId: string | number | undefined,
  currencyCode: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['cash-session', 'current', { storeId, cashierId, currencyCode }],
    queryFn: () => paymentApi.currentCashSession(storeId!, cashierId!, currencyCode),
    enabled: enabled && Boolean(storeId) && Boolean(cashierId) && Boolean(currencyCode),
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useCashSessionHistory(
  storeId: string | number | undefined,
  cashierId: string | number | undefined,
  currencyCode: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['cash-session', 'history', { storeId, cashierId, currencyCode }],
    queryFn: () => paymentApi.cashSessionHistory(storeId!, cashierId!, currencyCode),
    enabled: enabled && Boolean(storeId) && Boolean(cashierId) && Boolean(currencyCode),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useOpenCashSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: paymentApi.openCashSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-session'] }),
  })
}

export function useAddCashMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CashMovementInput }) => paymentApi.addCashMovement(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-session'] }),
  })
}

export function useCloseCashSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CloseCashSessionInput }) => paymentApi.closeCashSession(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cash-session'] }),
  })
}

export function usePaymentStatus(id?: number) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === 'PENDING' ? 3000 : false,
  })
}

export function usePaymentPeriods(storeId: string | number | undefined, from: string, to: string, currencyCode: string, bucket: ReportBucket, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'payment-periods', { storeId, from, to, currencyCode, bucket }],
    queryFn: () => paymentApi.periods(storeId!, from, to, currencyCode, bucket),
    enabled: enabled && Boolean(storeId) && Boolean(from) && Boolean(to),
    staleTime: 30 * 1000,
  })
}
