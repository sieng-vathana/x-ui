import { API_BASE_URL, ApiClient } from '../../lib/api'
import type { User, UserRole, CreateUserPayload, UpdateUserPayload } from './types'

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
    try {
      const response = await api.request<ApiEnvelope<UserRole[]>>('/users/roles')
      return response.data ?? []
    } catch {
      return [
        { id: 1, roleCode: 'OWNER', roleName: 'Owner', description: 'Full system access' },
        { id: 2, roleCode: 'MANAGER', roleName: 'Store Manager', description: 'Store operations & inventory' },
        { id: 3, roleCode: 'CASHIER', roleName: 'Cashier', description: 'POS checkout & sales' },
        { id: 4, roleCode: 'INVENTORY_MANAGER', roleName: 'Inventory Staff', description: 'Stock & purchasing' },
      ]
    }
  },
}
