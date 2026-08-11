import { API_BASE_URL, ApiClient } from '../../lib/api'
import type { PermissionCatalogItem, RoleDetails, RolePayload, RoleSummary } from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.data === undefined) throw new Error(response.message ?? response.error ?? fallback)
  return response.data
}

export const roleApi = {
  async list(businessId: number): Promise<RoleSummary[]> {
    const response = await api.request<ApiEnvelope<RoleSummary[]>>(`/roles?businessId=${businessId}`)
    return response.data ?? []
  },
  async permissions(businessId: number): Promise<PermissionCatalogItem[]> {
    const response = await api.request<ApiEnvelope<PermissionCatalogItem[]>>(
      `/roles/permissions?businessId=${businessId}`,
    )
    return response.data ?? []
  },
  async details(id: number, businessId: number): Promise<RoleDetails> {
    return requireData(
      await api.request<ApiEnvelope<RoleDetails>>(`/roles/${id}?businessId=${businessId}`),
      'Role details were not found.',
    )
  },
  async create(payload: RolePayload): Promise<RoleDetails> {
    return requireData(
      await api.request<ApiEnvelope<RoleDetails>>('/roles', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
      'Role creation failed.',
    )
  },
  async update(id: number, payload: RolePayload): Promise<RoleDetails> {
    return requireData(
      await api.request<ApiEnvelope<RoleDetails>>(`/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
      'Role update failed.',
    )
  },
  async remove(id: number, businessId: number): Promise<void> {
    await api.request<void>(`/roles/${id}?businessId=${businessId}`, { method: 'DELETE' })
  },
}
