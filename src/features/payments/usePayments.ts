import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentApi } from './paymentApi'

export function useCreateCashPayment() {
  return useMutation({ mutationFn: paymentApi.createCash })
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
