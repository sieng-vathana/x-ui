import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  CreatePosOrderInput,
  OrderPage,
  PosOrder,
} from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.data === undefined) {
    throw new Error(response.message ?? response.error ?? fallback)
  }
  return response.data
}

export const orderApi = {
  async list(storeId: string | number, page = 0, size = 20): Promise<OrderPage> {
    const numericStoreId = Number(storeId)
    if (!Number.isInteger(numericStoreId) || numericStoreId <= 0) {
      throw new Error('A valid store must be selected before loading orders.')
    }

    return requireData(
      await api.request<ApiEnvelope<OrderPage>>(
        `/orders?storeId=${numericStoreId}&page=${page}&size=${size}`,
      ),
      'Recent orders could not be loaded.',
    )
  },

  async createPos(input: CreatePosOrderInput): Promise<PosOrder> {
    return requireData(
      await api.request<ApiEnvelope<PosOrder>>('/orders/pos', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      'The order could not be created.',
    )
  },

  async complete(id: number): Promise<PosOrder> {
    return requireData(
      await api.request<ApiEnvelope<PosOrder>>(`/orders/${id}/complete`, {
        method: 'POST',
      }),
      'The order could not be completed.',
    )
  },
}
