import { API_BASE_URL, ApiClient } from '../../lib/api'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string }

export type PlanCode = 'STARTER' | 'BUSINESS' | 'PRO'
export type BillingCycle = 'MONTHLY' | 'YEARLY'

/** Features that differ between plans; everything else is in every plan. */
export type PlanFeature =
  | 'PRODUCT_IMPORT'
  | 'INVENTORY'
  | 'PURCHASING'
  | 'SHIFT_REPORTS'
  | 'CUSTOMERS_LOYALTY'
  | 'ALL_TELEGRAM_ALERTS'
  | 'CUSTOM_ROLES'
  | 'FULL_REPORTS'
  | 'MARKETPLACE'
  | 'DELIVERY'
  | 'PRIORITY_SUPPORT'

export interface Plan {
  code: PlanCode
  name: string
  tagline: string
  monthlyPrice: number
  yearlyPrice: number
  currencyCode: string
  trialDays: number
  /** null = unlimited */
  maxStores: number | null
  maxStaff: number | null
  maxProducts: number | null
  maxTelegramChats: number | null
  features: PlanFeature[]
  comparison: { key: string; label: string; included: boolean }[]
}

export interface MyPlan {
  plan: Plan
  billingCycle: BillingCycle | null
  trialEndsAt: string | null
  usage: { stores: number; staff: number; products: number }
}

export const planApi = {
  async list(): Promise<Plan[]> {
    const response = await api.request<ApiEnvelope<Plan[]>>('/plans')
    return response.data ?? []
  },

  async mine(): Promise<MyPlan> {
    const response = await api.request<ApiEnvelope<MyPlan>>('/plans/mine')
    if (!response.data) throw new Error(response.message || 'Your plan could not be loaded.')
    return response.data
  },
}
