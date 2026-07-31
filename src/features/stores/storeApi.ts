import { API_BASE_URL, ApiClient } from '../../lib/api'
import { resolveImageUrl } from '../files/fileApi'
import type { BffStore, CreateStoreRequest, UpdateStoreRequest } from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })

type ApiEnvelope<T> = { data?: T; message?: string }
type PageResponse<T> = { content?: T[] }

async function withDirectImageUrls(store: BffStore): Promise<BffStore> {
  if (!store.images?.length) return store
  const images = await Promise.all(store.images.map(async (image) => {
    const imageUrl = await resolveImageUrl(image.imageUrl)
    return imageUrl ? { ...image, imageUrl } : null
  }))
  return { ...store, images: images.filter((image): image is NonNullable<typeof image> => image !== null) }
}

export const storeApi = {
  async getByBusiness(businessId: string): Promise<BffStore[]> {
    const response = await api.request<ApiEnvelope<PageResponse<BffStore>>>(
      `/stores?businessId=${businessId}&size=100`,
    )
    return Promise.all((response.data?.content ?? []).map(withDirectImageUrls))
  },

  async create(request: CreateStoreRequest): Promise<BffStore> {
    const response = await api.request<ApiEnvelope<BffStore>>('/stores', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    if (!response.data) throw new Error(response.message ?? 'Store creation failed.')
    return response.data
  },

  async update(id: number, request: UpdateStoreRequest): Promise<BffStore> {
    const response = await api.request<ApiEnvelope<BffStore>>(`/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    })
    if (!response.data) throw new Error(response.message ?? 'Store update failed.')
    return response.data
  },

  /** The API owns the soft-delete implementation; the browser never hard-deletes data. */
  async softDelete(id: number): Promise<void> {
    await api.request<void>(`/stores/${id}`, { method: 'DELETE' })
  },
}
