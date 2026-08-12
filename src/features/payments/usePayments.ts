import { useMutation, useQuery } from '@tanstack/react-query'
import { paymentApi } from './paymentApi'

export function useCreateCashPayment() {
  return useMutation({ mutationFn: paymentApi.createCash })
}

export function useCreateQrPayment() {
  return useMutation({ mutationFn: paymentApi.createQr })
}

export function usePaymentsForOrder(orderId?: number) {
  return useQuery({
    queryKey: ['payments', { orderId }],
    queryFn: () => paymentApi.listForOrder(orderId!),
    enabled: Boolean(orderId),
  })
}
