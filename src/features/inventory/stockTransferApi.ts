import { API_BASE_URL, ApiClient } from '../../lib/api'

const api = new ApiClient({ baseUrl: API_BASE_URL })

export type StockTransferStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'RECEIVED_WITH_VARIANCE'
  | 'CANCELLED'

export interface StockTransferLine {
  id: number
  variantId: number
  productName: string
  variantName?: string | null
  sku?: string | null
  quantityRequested: number
  quantityDispatched: number
  quantityReceived: number
  quantityMissing: number
}

export interface StockTransfer {
  id: number
  sourceStoreId: number
  destinationStoreId: number
  status: StockTransferStatus
  note?: string | null
  resolutionNote?: string | null
  requestedBy?: number | null
  approvedBy?: number | null
  dispatchedBy?: number | null
  receivedBy?: number | null
  createdAt: string
  approvedAt?: string | null
  dispatchedAt?: string | null
  receivedAt?: string | null
  lines: StockTransferLine[]
}

export interface StockTransferPage {
  content: StockTransfer[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface CreateStockTransferInput {
  sourceStoreId: number
  destinationStoreId: number
  performedBy?: number
  note?: string
  lines: { variantId: number; quantity: number }[]
}

export interface StockTransferCommandInput {
  performedBy?: number
  note?: string
}

export type StockTransferAction = 'approve' | 'reject' | 'cancel' | 'dispatch'

export interface ReceiveStockTransferInput extends StockTransferCommandInput {
  lines: { lineId: number; receivedQuantity: number; missingQuantity: number }[]
}

type Envelope<T> = { data?: T; message?: string; error?: string }

function requireData<T>(envelope: Envelope<T>, fallback: string): T {
  if (!envelope.data) throw new Error(envelope.message ?? envelope.error ?? fallback)
  return envelope.data
}

export const stockTransferApi = {
  async list(storeId: number): Promise<StockTransferPage> {
    const query = new URLSearchParams({ storeId: String(storeId), page: '0', size: '100' })
    const envelope = await api.request<Envelope<StockTransferPage>>(`/stock/transfers?${query}`)
    return requireData(envelope, 'Stock transfers could not be loaded.')
  },

  async create(input: CreateStockTransferInput): Promise<StockTransfer> {
    const envelope = await api.request<Envelope<StockTransfer>>('/stock/transfers', {
      method: 'POST', body: JSON.stringify(input),
    })
    return requireData(envelope, 'Stock transfer could not be created.')
  },

  async command(id: number, action: StockTransferAction, input: StockTransferCommandInput): Promise<StockTransfer> {
    const envelope = await api.request<Envelope<StockTransfer>>(`/stock/transfers/${id}/${action}`, {
      method: 'POST', body: JSON.stringify(input),
    })
    return requireData(envelope, `Stock transfer could not be ${action}d.`)
  },

  async receive(id: number, input: ReceiveStockTransferInput): Promise<StockTransfer> {
    const envelope = await api.request<Envelope<StockTransfer>>(`/stock/transfers/${id}/receive`, {
      method: 'POST', body: JSON.stringify(input),
    })
    return requireData(envelope, 'Stock receipt could not be recorded.')
  },
}
