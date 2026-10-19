import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { planApi, type PlanFeature } from './planApi'

export function usePlans() {
  return useQuery({ queryKey: ['plans'], queryFn: planApi.list, staleTime: 60 * 60 * 1000 })
}

export function useMyPlan() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['plans', 'mine', user?.business.id],
    queryFn: planApi.mine,
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

/**
 * What the merchant's plan includes. Until the plan is known, or when it cannot be loaded (for example a session
 * from before plans), everything shows: the server still refuses what the plan does not include.
 */
export function usePlanFeatures() {
  const { data } = useMyPlan()
  const features = data?.plan.features
  return {
    plan: data?.plan,
    has: (feature: PlanFeature) => !features || features.includes(feature),
  }
}
