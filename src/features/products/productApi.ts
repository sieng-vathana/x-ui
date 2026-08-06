import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  ApiEnvelope,
  CreateProductPayload,
  PageEnvelope,
  ProductBrand,
  ProductCategory,
  ProductItem,
  ProductTax,
  ProductUnit,
} from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })

function buildStoreParam(storeId?: string | number): string {
  if (storeId === undefined || storeId === null || storeId === '') return ''
  const num = Number(storeId)
  if (!isNaN(num) && num > 0) {
    return `&storeId=${num}`
  }
  return ''
}

export const productApi = {
  async getProducts(storeId?: string | number, page = 0, size = 100): Promise<ProductItem[]> {
    const numStoreId = Number(storeId) || 2 // fallback storeId
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductItem>>>(
      `/products?storeId=${numStoreId}&page=${page}&size=${size}`,
    )
    return response.data?.content ?? []
  },

  async createProduct(payload: CreateProductPayload): Promise<ProductItem> {
    const response = await api.request<ApiEnvelope<ProductItem>>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!response.data) {
      throw new Error(response.message || 'Failed to create product.')
    }
    return response.data
  },

  async getCategories(businessId: string | number, storeId?: string | number): Promise<ProductCategory[]> {
    const storeParam = buildStoreParam(storeId)
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductCategory>>>(
      `/products/categories?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },

  async getUnits(businessId: string | number, storeId?: string | number): Promise<ProductUnit[]> {
    const storeParam = buildStoreParam(storeId)
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductUnit>>>(
      `/products/units?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },

  async getBrands(businessId: string | number, storeId?: string | number): Promise<ProductBrand[]> {
    const storeParam = buildStoreParam(storeId)
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductBrand>>>(
      `/products/brands?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },

  async getTaxes(businessId: string | number, storeId?: string | number): Promise<ProductTax[]> {
    const storeParam = buildStoreParam(storeId)
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductTax>>>(
      `/products/taxes?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },
}
