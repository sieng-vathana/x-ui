import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  CreateDeliveryInput,
  CreateDeliveryQuoteInput,
  Delivery,
  DeliveryFilters,
  DeliveryPage,
  DeliveryQuote,
  RecordRemittanceInput,
  UpdateDeliveryStatusInput,
} from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.data === undefined) {
    throw new Error(response.message ?? response.error ?? fallback)
  }
  return response.data
}

export const deliveryApi = {
  async list(filters: DeliveryFilters): Promise<DeliveryPage> {
    const query = new URLSearchParams()
    if (filters.storeId) query.set('storeId', String(filters.storeId))
    if (filters.orderId) query.set('orderId', String(filters.orderId))
    if (filters.status) query.set('status', filters.status)
    if (filters.providerType) query.set('providerType', filters.providerType)
    if (filters.search) query.set('search', filters.search)
    query.set('page', String(filters.page ?? 0))
    query.set('size', String(filters.size ?? 20))

    return requireData(
      await api.request<ApiEnvelope<DeliveryPage>>(`/deliveries?${query.toString()}`),
      'Deliveries could not be loaded.',
    )
  },

  async get(id: number): Promise<Delivery> {
    return requireData(
      await api.request<ApiEnvelope<Delivery>>(`/deliveries/${id}`),
      'Delivery could not be loaded.',
    )
  },

  async createQuotes(input: CreateDeliveryQuoteInput): Promise<DeliveryQuote[]> {
    return requireData(
      await api.request<ApiEnvelope<DeliveryQuote[]>>('/deliveries/quotes', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      'Delivery quotes could not be retrieved.',
    )
  },

  async createDelivery(input: CreateDeliveryInput): Promise<Delivery> {
    return requireData(
      await api.request<ApiEnvelope<Delivery>>('/deliveries', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      'Delivery could not be created.',
    )
  },

  async updateStatus(input: UpdateDeliveryStatusInput): Promise<Delivery> {
    return requireData(
      await api.request<ApiEnvelope<Delivery>>(`/deliveries/${input.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: input.status, failureReason: input.failureReason }),
      }),
      'Delivery status could not be updated.',
    )
  },

  async recordRemittance(input: RecordRemittanceInput): Promise<Delivery> {
    return requireData(
      await api.request<ApiEnvelope<Delivery>>(`/deliveries/${input.id}/remittance`, {
        method: 'POST',
        body: JSON.stringify({ remittedAmount: input.remittedAmount }),
      }),
      'COD remittance could not be recorded.',
    )
  },
}
