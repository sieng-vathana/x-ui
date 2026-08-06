import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  ApiEnvelope,
  CreateProductPayload,
  PageEnvelope,
  ProductAttribute,
  ProductAttributeValue,
  ProductBrand,
  ProductCategory,
  ProductItem,
  ProductSupplier,
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

  async getSuppliers(businessId: string | number, storeId?: string | number): Promise<ProductSupplier[]> {
    const storeParam = buildStoreParam(storeId)
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductSupplier>>>(
      `/products/suppliers?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },

  async getAttributes(businessId: string | number): Promise<ProductAttribute[]> {
    const response = await api.request<ApiEnvelope<ProductAttribute[]>>(
      `/products/attributes?businessId=${businessId}`,
    )
    return response.data ?? []
  },

  async getAttributeValues(attributeId: number): Promise<ProductAttributeValue[]> {
    const response = await api.request<ApiEnvelope<ProductAttributeValue[]>>(
      `/products/attributes/${attributeId}/values`,
    )
    return response.data ?? []
  },

  async uploadFile(file: File): Promise<{ id: number; url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.request<ApiEnvelope<{ id: number; url?: string; relativePath?: string }>>(
      '/files',
      {
        method: 'POST',
        body: formData,
      },
    )
    if (!response.data) {
      throw new Error(response.message || 'Failed to upload image')
    }
    const imageUrl = response.data.url || `/api/v1/files/${response.data.id}/content`
    return { id: response.data.id, url: imageUrl }
  },

  async getProductById(idOrSku: string | number): Promise<ProductItem> {
    const response = await api.request<ApiEnvelope<ProductItem>>(`/products/${idOrSku}`)
    if (!response.data) {
      throw new Error(response.message || 'Product not found.')
    }
    return response.data
  },

  async updateProduct(idOrSku: string | number, payload: CreateProductPayload): Promise<ProductItem> {
    const response = await api.request<ApiEnvelope<ProductItem>>(`/products/${idOrSku}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (!response.data) {
      throw new Error(response.message || 'Failed to update product.')
    }
    return response.data
  },
}
