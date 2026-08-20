import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import { paymentApi } from './paymentApi'

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

export function usePaymentStatus(id?: number) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === 'PENDING' ? 3000 : false,
  })
}
