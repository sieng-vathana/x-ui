import { useMutation } from '@tanstack/react-query'
import { orderApi } from './orderApi'

export function useCreatePosOrder() {
  return useMutation({ mutationFn: orderApi.createPos })
}

export function useCompleteOrder() {
  return useMutation({ mutationFn: orderApi.complete })
}
