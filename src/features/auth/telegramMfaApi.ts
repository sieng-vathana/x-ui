import { API_BASE_URL, ApiClient } from '../../lib/api'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string }

export type TelegramMfaStatus = {
  botConfigured: boolean
  botUsername?: string | null
  connected: boolean
  enabled: boolean
  linkPending: boolean
}

export const telegramMfaApi = {
  async status(): Promise<TelegramMfaStatus> {
    const response = await api.request<ApiEnvelope<TelegramMfaStatus>>('/auth/security/telegram-mfa')
    if (!response.data) throw new Error(response.message || 'Security settings could not be loaded.')
    return response.data
  },

  async createLink(): Promise<{ url: string; expiresAt: string }> {
    const response = await api.request<ApiEnvelope<{ url: string; expiresAt: string }>>('/auth/security/telegram-mfa/link', { method: 'POST' })
    if (!response.data) throw new Error(response.message || 'A Telegram connection link could not be created.')
    return response.data
  },

  async setEnabled(enabled: boolean, currentPassword: string): Promise<TelegramMfaStatus> {
    const response = await api.request<ApiEnvelope<TelegramMfaStatus>>('/auth/security/telegram-mfa', {
      method: 'PUT', body: JSON.stringify({ enabled, currentPassword }),
    })
    if (!response.data) throw new Error(response.message || 'Telegram 2FA could not be updated.')
    return response.data
  },

  async disconnect(currentPassword: string): Promise<TelegramMfaStatus> {
    const response = await api.request<ApiEnvelope<TelegramMfaStatus>>('/auth/security/telegram-mfa/disconnect', {
      method: 'POST', body: JSON.stringify({ currentPassword }),
    })
    if (!response.data) throw new Error(response.message || 'Telegram could not be disconnected.')
    return response.data
  },
}
