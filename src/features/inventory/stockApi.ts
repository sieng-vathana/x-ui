import { API_BASE_URL, ApiClient } from '../../lib/api'

const api = new ApiClient({ baseUrl: API_BASE_URL })

export interface StockBalance {
  id: number
  storeId: number
  variantId: number
  quantityOnHand: number
  quantityReserved: number
  availableQuantity: number
}

type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

export const stockApi = {
  async getBalance(storeId: number, variantId: number): Promise<StockBalance> {
    const response = await api.request<ApiEnvelope<StockBalance>>(
      `/stock/balance?storeId=${storeId}&variantId=${variantId}`,
    )
    if (!response.data) {
      throw new Error(response.message ?? response.error ?? 'Stock balance could not be loaded.')
    }
    return response.data
  },
}
