import { API_BASE_URL, ApiClient } from '../../lib/api'
import type { Customer } from '../customers/types'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

export interface LoyaltyProgram {
  businessId: number
  enabled: boolean
  /** Points earned per US dollar paid; riel sales convert at the business rate. */
  pointsPerUsd: number
  /** What one point is worth in US dollars when redeemed. */
  pointValueUsd: number
  minRedeemPoints: number
  /** Percent off every item for saved customers at the POS. */
  memberDiscountPercent: number
}

export type LoyaltyProgramInput = Omit<LoyaltyProgram, 'businessId'>

export interface CustomerLoyalty {
  customerId: number
  points: number
}

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.data === undefined) throw new Error(response.message ?? response.error ?? fallback)
  return response.data
}

export const loyaltyApi = {
  async program(businessId: number): Promise<LoyaltyProgram> {
    return requireData(
      await api.request<ApiEnvelope<LoyaltyProgram>>(`/loyalty/program?businessId=${encodeURIComponent(businessId)}`),
      'Loyalty settings could not be loaded.',
    )
  },

  async updateProgram(businessId: number, input: LoyaltyProgramInput): Promise<LoyaltyProgram> {
    return requireData(
      await api.request<ApiEnvelope<LoyaltyProgram>>(`/loyalty/program?businessId=${encodeURIComponent(businessId)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
      'Loyalty settings could not be saved.',
    )
  },

  async lookupByPhone(businessId: number, phone: string): Promise<Customer> {
    return requireData(
      await api.request<ApiEnvelope<Customer>>(
        `/customers/lookup?businessId=${encodeURIComponent(businessId)}&phone=${encodeURIComponent(phone)}`,
      ),
      'No customer has this phone number.',
    )
  },

  async customerPoints(businessId: number, customerId: number): Promise<CustomerLoyalty> {
    return requireData(
      await api.request<ApiEnvelope<CustomerLoyalty>>(
        `/customers/${encodeURIComponent(customerId)}/loyalty?businessId=${encodeURIComponent(businessId)}`,
      ),
      'Customer points could not be loaded.',
    )
  },
}
