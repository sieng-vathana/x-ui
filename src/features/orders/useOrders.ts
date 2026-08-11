import { useMutation } from '@tanstack/react-query'
import { orderApi, paymentApi } from './orderApi'

export function useCreatePosOrder() {
  return useMutation({ mutationFn: orderApi.createPos })
}

export function useCreatePayment() {
  return useMutation({ mutationFn: paymentApi.create })
}

export function useCompleteOrder() {
  return useMutation({ mutationFn: orderApi.complete })
}
