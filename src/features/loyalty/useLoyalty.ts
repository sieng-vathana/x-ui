import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loyaltyApi, type LoyaltyProgramInput } from './loyaltyApi'

export const loyaltyQueryKeys = {
  program: (businessId: number) => ['loyalty', 'program', businessId] as const,
  customerPoints: (businessId: number, customerId: number) => ['loyalty', 'customer', businessId, customerId] as const,
}

export function useLoyaltyProgram(businessId: number, enabled = true) {
  return useQuery({
    queryKey: loyaltyQueryKeys.program(businessId),
    queryFn: () => loyaltyApi.program(businessId),
    enabled: enabled && businessId > 0,
    staleTime: 60 * 1000,
  })
}

export function useUpdateLoyaltyProgram(businessId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoyaltyProgramInput) => loyaltyApi.updateProgram(businessId, input),
    onSuccess: (program) => queryClient.setQueryData(loyaltyQueryKeys.program(businessId), program),
  })
}

/** The selected customer's current points; refreshed after each sale. */
export function useCustomerPoints(businessId: number, customerId: number, enabled: boolean) {
  return useQuery({
    queryKey: loyaltyQueryKeys.customerPoints(businessId, customerId),
    queryFn: () => loyaltyApi.customerPoints(businessId, customerId),
    enabled: enabled && businessId > 0 && customerId > 0,
  })
}

export function useCustomerLookup(businessId: number) {
  return useMutation({ mutationFn: (phone: string) => loyaltyApi.lookupByPhone(businessId, phone) })
}
