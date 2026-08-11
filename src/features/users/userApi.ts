import { API_BASE_URL, ApiClient } from '../../lib/api'
import type {
  User,
  UserRole,
  UserRoleDetails,
  CreateUserPayload,
  UpdateUserPayload,
} from './types'

const api = new ApiClient({ baseUrl: API_BASE_URL })

type ApiEnvelope<T> = { data?: T; message?: string; error?: string }
type PageResponse<T> = { content?: T[] }

export const userApi = {
  async getUsers(page = 0, size = 50): Promise<User[]> {
    try {
      const response = await api.request<ApiEnvelope<PageResponse<User>>>(
        `/users?page=${page}&size=${size}`,
      )
      return response.data?.content ?? []
    } catch {
      return []
    }
  },

  async getUserById(id: number): Promise<User> {
    const response = await api.request<ApiEnvelope<User>>(`/users/${id}`)
    if (!response.data) throw new Error(response.message ?? 'User not found')
    return response.data
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    const response = await api.request<ApiEnvelope<User>>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!response.data) throw new Error(response.message ?? response.error ?? 'Failed to create user')
    return response.data
  },

  async updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
    const response = await api.request<ApiEnvelope<User>>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (!response.data) throw new Error(response.message ?? response.error ?? 'Failed to update user')
    return response.data
  },

  async deleteUser(id: number): Promise<void> {
    await api.request<void>(`/users/${id}`, { method: 'DELETE' })
  },

  async getRoles(): Promise<UserRole[]> {
    const response = await api.request<ApiEnvelope<UserRole[]>>('/users/roles')
    return response.data ?? []
  },

  async getRoleDetails(id: number): Promise<UserRoleDetails> {
    const response = await api.request<ApiEnvelope<UserRoleDetails>>(`/users/roles/${id}`)
    if (!response.data) {
      throw new Error(response.message ?? response.error ?? 'Role details were not found')
    }
    return response.data
  },
}
