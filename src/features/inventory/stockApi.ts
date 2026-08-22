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

export type StockMovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'SALE'
  | 'RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'RESERVATION'
  | 'RESERVATION_RELEASE'
  | 'RESERVATION_CONSUMED'
  | 'RESERVATION_REOPENED'
  | 'RESERVATION_EXPIRED'

export interface StockMovement {
  id: number
  storeId: number
  variantId: number
  movementType: StockMovementType
  quantityDelta: number
  referenceType?: string | null
  referenceId?: string | null
  performedBy?: number | null
  note?: string | null
  createdAt: string
}

export interface StockMovementPage {
  content: StockMovement[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface StockMovementFilters {
  storeId: number
  variantId?: number
  movementType?: StockMovementType
  from?: string
  to?: string
  page?: number
  size?: number
}

export interface StockChangeInput {
  storeId: number
  variantId: number
  quantity: number
  referenceType?: string
  referenceId?: string
  performedBy?: number
  note?: string
}

type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (!response.data) {
    throw new Error(response.message ?? response.error ?? fallback)
  }
  return response.data
}

async function changeStock(path: string, input: StockChangeInput): Promise<StockBalance> {
  const response = await api.request<ApiEnvelope<StockBalance>>(path, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return requireData(response, 'Stock change could not be completed.')
}

export const stockApi = {
  async getBalance(storeId: number, variantId: number): Promise<StockBalance> {
    const params = new URLSearchParams({
      storeId: String(storeId),
      variantId: String(variantId),
    })
    const response = await api.request<ApiEnvelope<StockBalance>>('/stock/balance?' + params.toString())
    return requireData(response, 'Stock balance could not be loaded.')
  },

  async listMovements(filters: StockMovementFilters): Promise<StockMovementPage> {
    const params = new URLSearchParams({ storeId: String(filters.storeId) })
    if (filters.variantId !== undefined) params.set('variantId', String(filters.variantId))
    if (filters.movementType) params.set('movementType', filters.movementType)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.page !== undefined) params.set('page', String(filters.page))
    if (filters.size !== undefined) params.set('size', String(filters.size))

    const response = await api.request<ApiEnvelope<StockMovementPage>>(
      '/stock/movements?' + params.toString(),
    )
    return requireData(response, 'Stock movements could not be loaded.')
  },

  async stockIn(input: StockChangeInput): Promise<StockBalance> {
    return changeStock('/stock/in', input)
  },

  async stockOut(input: StockChangeInput): Promise<StockBalance> {
    return changeStock('/stock/out', input)
  },
}
