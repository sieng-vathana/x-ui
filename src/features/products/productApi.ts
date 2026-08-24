import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  AddOptionValueApiPayload,
  ApiEnvelope,
  CreateProductBrandPayload,
  CreateProductCategoryPayload,
  CreateProductOptionApiPayload,
  CreateProductPayload,
  CreateProductUnitPayload,
  PageEnvelope,
  ProductAttribute,
  ProductAttributeValue,
  ProductBrand,
  ProductCategory,
  ProductItem,
  ProductOptionApi,
  ProductOptionValueApi,
  ProductSupplier,
  ProductTax,
  ProductUnit,
  UpdateProductOptionApiPayload,
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
    const numStoreId = Number(storeId)
    if (!Number.isInteger(numStoreId) || numStoreId <= 0) {
      throw new Error('A valid store must be selected before loading products.')
    }
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

  async createCategory(payload: CreateProductCategoryPayload): Promise<ProductCategory> {
    const response = await api.request<ApiEnvelope<ProductCategory>>('/products/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!response.data) {
      throw new Error(response.message || 'Failed to create category.')
    }
    return response.data
  },

  async updateCategory(id: number, payload: CreateProductCategoryPayload): Promise<ProductCategory> {
    const response = await api.request<ApiEnvelope<ProductCategory>>(
      `/products/categories/${id}?businessId=${payload.businessId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    )
    if (!response.data) {
      throw new Error(response.message || 'Failed to update category.')
    }
    return response.data
  },

  async deleteCategory(id: number, businessId: string | number): Promise<void> {
    await api.request<ApiEnvelope<void>>(`/products/categories/${id}?businessId=${businessId}`, {
      method: 'DELETE',
    })
  },

  async getUnits(businessId: string | number, storeId?: string | number): Promise<ProductUnit[]> {
    const storeParam = buildStoreParam(storeId)
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductUnit>>>(
      `/products/units?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },

  async createUnit(payload: CreateProductUnitPayload): Promise<ProductUnit> {
    const response = await api.request<ApiEnvelope<ProductUnit>>('/products/units', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!response.data) {
      throw new Error(response.message || 'Failed to create unit.')
    }
    return response.data
  },

  async updateUnit(id: number, payload: CreateProductUnitPayload): Promise<ProductUnit> {
    const response = await api.request<ApiEnvelope<ProductUnit>>(
      `/products/units/${id}?businessId=${payload.businessId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    )
    if (!response.data) {
      throw new Error(response.message || 'Failed to update unit.')
    }
    return response.data
  },

  async deleteUnit(id: number, businessId: string | number): Promise<void> {
    await api.request<ApiEnvelope<void>>(`/products/units/${id}?businessId=${businessId}`, {
      method: 'DELETE',
    })
  },

  async getBrands(businessId: string | number, storeId?: string | number): Promise<ProductBrand[]> {
    const storeParam = buildStoreParam(storeId)
    const response = await api.request<ApiEnvelope<PageEnvelope<ProductBrand>>>(
      `/products/brands?businessId=${businessId}${storeParam}&size=100`,
    )
    return response.data?.content ?? []
  },

  async createBrand(payload: CreateProductBrandPayload): Promise<ProductBrand> {
    const response = await api.request<ApiEnvelope<ProductBrand>>('/products/brands', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!response.data) {
      throw new Error(response.message || 'Failed to create brand.')
    }
    return response.data
  },

  async updateBrand(id: number, payload: CreateProductBrandPayload): Promise<ProductBrand> {
    const response = await api.request<ApiEnvelope<ProductBrand>>(
      `/products/brands/${id}?businessId=${payload.businessId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    )
    if (!response.data) {
      throw new Error(response.message || 'Failed to update brand.')
    }
    return response.data
  },

  async deleteBrand(id: number, businessId: string | number): Promise<void> {
    await api.request<ApiEnvelope<void>>(`/products/brands/${id}?businessId=${businessId}`, {
      method: 'DELETE',
    })
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

  // 2. Get All Options by Business ID (GET /api/v1/products/attributes?businessId={{businessId}})
  async getProductOptions(businessId: string | number): Promise<ProductOptionApi[]> {
    const response = await api.request<ApiEnvelope<ProductOptionApi[] | PageEnvelope<ProductOptionApi>> | ProductOptionApi[]>(
      `/products/attributes?businessId=${businessId}`,
    )
    if (Array.isArray(response)) return response
    if (Array.isArray((response as ApiEnvelope<ProductOptionApi[]>).data)) {
      return (response as ApiEnvelope<ProductOptionApi[]>).data ?? []
    }
    return ((response as ApiEnvelope<PageEnvelope<ProductOptionApi>>).data as PageEnvelope<ProductOptionApi>)?.content ?? []
  },

  // 3. Get Single Option by ID (GET /api/v1/products/attributes/{{optionId}})
  async getSingleOption(optionId: string | number): Promise<ProductOptionApi> {
    const response = await api.request<ApiEnvelope<ProductOptionApi> | ProductOptionApi>(
      `/products/attributes/${optionId}`,
    )
    if (response && typeof response === 'object' && 'data' in response && response.data) {
      return response.data
    }
    return response as ProductOptionApi
  },

  // 1. Create Product Option (POST /api/v1/products/attributes)
  async createProductOption(payload: CreateProductOptionApiPayload): Promise<ProductOptionApi> {
    const response = await api.request<ApiEnvelope<ProductOptionApi>>('/products/attributes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (response && typeof response === 'object' && 'data' in response && response.data) {
      return response.data
    }
    return response as ProductOptionApi
  },

  // 4. Update Option & Values (PUT Edit) (PUT /api/v1/products/attributes/{{optionId}})
  async updateProductOption(id: number | string, payload: UpdateProductOptionApiPayload): Promise<ProductOptionApi> {
    const response = await api.request<ApiEnvelope<ProductOptionApi>>(`/products/attributes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (response && typeof response === 'object' && 'data' in response && response.data) {
      return response.data
    }
    return response as ProductOptionApi
  },

  // 5. Add Single Value to Option (POST /api/v1/products/attributes/{{optionId}}/values)
  async addOptionValue(optionId: number | string, payload: AddOptionValueApiPayload): Promise<ProductOptionValueApi> {
    const response = await api.request<ApiEnvelope<ProductOptionValueApi>>(`/products/attributes/${optionId}/values`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (response && typeof response === 'object' && 'data' in response && response.data) {
      return response.data
    }
    return response as ProductOptionValueApi
  },

  // 6. Delete Option Value (DELETE /api/v1/products/attributes/values/{{valueId}})
  async deleteOptionValue(valueId: number | string): Promise<void> {
    await api.request<ApiEnvelope<void>>(`/products/attributes/values/${valueId}`, {
      method: 'DELETE',
    })
  },

  // 7. Soft Delete Option (DELETE /api/v1/products/attributes/{{optionId}})
  async deleteProductOption(id: number | string): Promise<void> {
    await api.request<ApiEnvelope<void>>(`/products/attributes/${id}`, {
      method: 'DELETE',
    })
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
    const s3Url = response.data.url
    if (!s3Url) {
      throw new Error('Storage service did not return an S3 URL')
    }
    return { id: response.data.id, url: s3Url }
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

  async deleteProduct(idOrSku: string | number): Promise<void> {
    await api.request<ApiEnvelope<void>>(`/products/${idOrSku}`, {
      method: 'DELETE',
    })
  },
}
