import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  PurchaseOrder,
  PurchaseOrderInput,
  Supplier,
  SupplierInput,
  SupplierReturn,
  SupplierReturnInput,
} from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }
type Page<T> = { content?: T[] }

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.data === undefined || response.data === null) throw new Error(response.message ?? response.error ?? fallback)
  return response.data
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

export const purchaseApi = {
  async suppliers(businessId: number): Promise<Supplier[]> {
    const page = requireData(
      await api.request<ApiEnvelope<Page<Supplier>>>(`/purchases/suppliers?businessId=${businessId}`),
      'Suppliers could not be loaded.',
    )
    return page.content ?? []
  },

  async createSupplier(input: SupplierInput): Promise<Supplier> {
    return requireData(await api.request<ApiEnvelope<Supplier>>('/purchases/suppliers', json('POST', input)), 'The supplier could not be saved.')
  },

  async updateSupplier(id: number, input: SupplierInput): Promise<Supplier> {
    return requireData(
      await api.request<ApiEnvelope<Supplier>>(`/purchases/suppliers/${id}?businessId=${input.businessId}`, json('PUT', input)),
      'The supplier could not be saved.',
    )
  },

  async orders(businessId: number, storeId?: number): Promise<PurchaseOrder[]> {
    const store = storeId ? `&storeId=${storeId}` : ''
    const page = requireData(
      await api.request<ApiEnvelope<Page<PurchaseOrder>>>(`/purchases/orders?businessId=${businessId}${store}`),
      'Purchase orders could not be loaded.',
    )
    return page.content ?? []
  },

  async order(businessId: number, id: number): Promise<PurchaseOrder> {
    return requireData(
      await api.request<ApiEnvelope<PurchaseOrder>>(`/purchases/orders/${id}?businessId=${businessId}`),
      'The purchase order could not be loaded.',
    )
  },

  async createOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
    return requireData(await api.request<ApiEnvelope<PurchaseOrder>>('/purchases/orders', json('POST', input)), 'The purchase order could not be saved.')
  },

  async updateOrder(id: number, input: PurchaseOrderInput): Promise<PurchaseOrder> {
    return requireData(await api.request<ApiEnvelope<PurchaseOrder>>(`/purchases/orders/${id}`, json('PUT', input)), 'The purchase order could not be saved.')
  },

  async orderAction(businessId: number, id: number, action: 'place' | 'close' | 'cancel'): Promise<PurchaseOrder> {
    return requireData(
      await api.request<ApiEnvelope<PurchaseOrder>>(`/purchases/orders/${id}/${action}?businessId=${businessId}`, json('POST')),
      'The purchase order could not be updated.',
    )
  },

  async receive(businessId: number, id: number, lines: Array<{
    lineId: number
    quantity: number
    batchCode?: string
    expiryDate?: string
  }>, note?: string): Promise<PurchaseOrder> {
    return requireData(
      await api.request<ApiEnvelope<PurchaseOrder>>(`/purchases/orders/${id}/receive?businessId=${businessId}`, json('POST', { lines, note })),
      'The goods could not be received.',
    )
  },

  async returns(businessId: number, storeId?: number): Promise<SupplierReturn[]> {
    const store = storeId ? `&storeId=${storeId}` : ''
    const page = requireData(
      await api.request<ApiEnvelope<Page<SupplierReturn>>>(`/purchases/returns?businessId=${businessId}${store}`),
      'Supplier returns could not be loaded.',
    )
    return page.content ?? []
  },

  async createReturn(input: SupplierReturnInput): Promise<SupplierReturn> {
    return requireData(await api.request<ApiEnvelope<SupplierReturn>>('/purchases/returns', json('POST', input)), 'The return could not be saved.')
  },

  async returnAction(businessId: number, id: number, action: 'complete' | 'cancel'): Promise<SupplierReturn> {
    return requireData(
      await api.request<ApiEnvelope<SupplierReturn>>(`/purchases/returns/${id}/${action}?businessId=${businessId}`, json('POST')),
      'The return could not be updated.',
    )
  },
}
