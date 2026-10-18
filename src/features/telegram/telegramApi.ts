import { API_BASE_URL, ApiClient, backgroundRequest } from '../../lib/api'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

export interface TelegramStatus {
  /** False until the platform's bot token is set on the server. */
  botConfigured: boolean
  botUsername?: string | null
  connected: boolean
  chatTitle?: string | null
  khqrAlerts: boolean
  orderAlerts: boolean
  lowStockAlerts: boolean
  dailySummary: boolean
  lowStockThreshold: number
  dailySummaryHour: number
}

export interface TelegramLink {
  privateChatUrl: string
  groupChatUrl: string
  expiresAt: string
}

export type TelegramPreferences = Partial<Pick<
  TelegramStatus,
  'khqrAlerts' | 'orderAlerts' | 'lowStockAlerts' | 'dailySummary' | 'lowStockThreshold' | 'dailySummaryHour'
>>

function requireData<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.data === undefined) {
    throw new Error(response.message ?? response.error ?? fallback)
  }
  return response.data
}

export const telegramApi = {
  /** Background requests let the page poll while the owner presses Start, without the app-wide loader. */
  async status(businessId: number, background = false): Promise<TelegramStatus> {
    return requireData(
      await api.request<ApiEnvelope<TelegramStatus>>(
        `/businesses/${encodeURIComponent(businessId)}/telegram`,
        background ? backgroundRequest() : {},
      ),
      'Telegram alerts could not be loaded.',
    )
  },

  async updatePreferences(businessId: number, preferences: TelegramPreferences): Promise<TelegramStatus> {
    return requireData(
      await api.request<ApiEnvelope<TelegramStatus>>(`/businesses/${encodeURIComponent(businessId)}/telegram`, {
        method: 'PUT',
        body: JSON.stringify(preferences),
      }),
      'Telegram alerts could not be saved.',
    )
  },

  async createLink(businessId: number): Promise<TelegramLink> {
    return requireData(
      await api.request<ApiEnvelope<TelegramLink>>(`/businesses/${encodeURIComponent(businessId)}/telegram/link`, {
        method: 'POST',
      }),
      'The Telegram link could not be created.',
    )
  },

  async disconnect(businessId: number): Promise<TelegramStatus> {
    return requireData(
      await api.request<ApiEnvelope<TelegramStatus>>(`/businesses/${encodeURIComponent(businessId)}/telegram`, {
        method: 'DELETE',
      }),
      'Telegram could not be disconnected.',
    )
  },

  async sendTest(businessId: number): Promise<void> {
    await api.request<ApiEnvelope<unknown>>(`/businesses/${encodeURIComponent(businessId)}/telegram/test`, {
      method: 'POST',
    })
  },
}
