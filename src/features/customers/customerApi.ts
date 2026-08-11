import { API_BASE_URL, ApiClient } from '../../lib/api'
import type { Customer, CustomerPage, CustomerPayload } from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.data === undefined) throw new Error(response.message ?? response.error ?? fallback)
  return response.data
}

export const customerApi = {
  async list(businessId: number, page = 0, size = 100): Promise<CustomerPage> {
    return requireData(
      await api.request<ApiEnvelope<CustomerPage>>(
        `/customers?businessId=${businessId}&page=${page}&size=${size}`,
      ),
      'Customer list could not be loaded.',
    )
  },

  async create(payload: CustomerPayload): Promise<Customer> {
    return requireData(
      await api.request<ApiEnvelope<Customer>>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
      'Customer could not be created.',
    )
  },

  async update(id: number, payload: CustomerPayload): Promise<Customer> {
    return requireData(
      await api.request<ApiEnvelope<Customer>>(`/customers/${id}?businessId=${payload.businessId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
      'Customer could not be updated.',
    )
  },

  async deactivate(id: number, businessId: number): Promise<void> {
    await api.request<ApiEnvelope<void>>(`/customers/${id}?businessId=${businessId}`, {
      method: 'DELETE',
    })
  },
}
