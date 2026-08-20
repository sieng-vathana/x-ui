import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  CreateHeldSaleInput,
  CreatePosOrderInput,
  OrderPage,
  PosOrder,
  SalesSummary,
  TopProduct,
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

  async salesSummary(storeId: string | number, from: string, to: string): Promise<SalesSummary> {
    return requireData(
      await api.request<ApiEnvelope<SalesSummary>>(
        `/orders/reports/sales-summary?storeId=${encodeURIComponent(storeId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
      'The sales summary could not be loaded.',
    )
  },

  async topProducts(storeId: string | number, from: string, to: string, limit = 10): Promise<TopProduct[]> {
    return requireData(
      await api.request<ApiEnvelope<TopProduct[]>>(
        `/orders/reports/top-products?storeId=${encodeURIComponent(storeId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${limit}`,
      ),
      'The product report could not be loaded.',
    )
  },

  async get(id: number): Promise<PosOrder> {
    if (!Number.isInteger(id) || id <= 0) throw new Error('A valid order is required to print a receipt.')
    return requireData(
      await api.request<ApiEnvelope<PosOrder>>(`/orders/${id}`),
      'The order receipt could not be loaded.',
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

  async listHeld(storeId: string | number, page = 0, size = 50): Promise<OrderPage> {
    const numericStoreId = Number(storeId)
    if (!Number.isInteger(numericStoreId) || numericStoreId <= 0) {
      throw new Error('A valid store must be selected before loading held sales.')
    }

    return requireData(
      await api.request<ApiEnvelope<OrderPage>>(
        `/orders/holds?storeId=${numericStoreId}&page=${page}&size=${size}`,
      ),
      'Held sales could not be loaded.',
    )
  },

  async createHeld(input: CreateHeldSaleInput): Promise<PosOrder> {
    return requireData(
      await api.request<ApiEnvelope<PosOrder>>('/orders/holds', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      'The sale could not be held.',
    )
  },

  async resumeHeld(id: number): Promise<PosOrder> {
    return requireData(
      await api.request<ApiEnvelope<PosOrder>>(`/orders/holds/${id}/resume`, {
        method: 'POST',
      }),
      'The held sale could not be resumed.',
    )
  },

  async discardHeld(id: number): Promise<PosOrder> {
    return requireData(
      await api.request<ApiEnvelope<PosOrder>>(`/orders/holds/${id}/discard`, {
        method: 'POST',
      }),
      'The held sale could not be discarded.',
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
