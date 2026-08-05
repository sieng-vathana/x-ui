import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  ApiEnvelope,
  PageEnvelope,
  ProductBrand,
  ProductCategory,
  ProductUnit,
} from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })

export const productApi = {
  async getCategories(businessId: string | number, storeId?: string | number): Promise<ProductCategory[]> {
    const storeParam = storeId ? `&storeId=${storeId}` : ''
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductCategory>>>(
      `/products/categories?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },

  async getUnits(businessId: string | number, storeId?: string | number): Promise<ProductUnit[]> {
    const storeParam = storeId ? `&storeId=${storeId}` : ''
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductUnit>>>(
      `/products/units?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },

  async getBrands(businessId: string | number, storeId?: string | number): Promise<ProductBrand[]> {
    const storeParam = storeId ? `&storeId=${storeId}` : ''
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductBrand>>>(
      `/products/brands?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },
}
