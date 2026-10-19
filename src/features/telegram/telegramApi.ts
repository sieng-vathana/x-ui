import { API_BASE_URL, ApiClient, backgroundRequest } from '../../lib/api'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string; error?: string }

/** One connected chat, or one topic of a group with topics. */
export interface TelegramChat {
  id: number
  chatTitle?: string | null
  /** private, group or supergroup */
  chatType?: string | null
  topicTitle?: string | null
  inTopic: boolean
  allStores: boolean
  storeIds: number[]
  khqrAlerts: boolean
  orderAlerts: boolean
  lowStockAlerts: boolean
  dailySummary: boolean
  connectedAt?: string | null
}

export interface TelegramStatus {
  /** False until the platform's bot token is set on the server. */
  botConfigured: boolean
  botUsername?: string | null
  connected: boolean
  lowStockThreshold: number
  dailySummaryHour: number
  /** A connect link is open and nobody has pressed Start with it yet. */
  linkPending: boolean
  chats: TelegramChat[]
}

export interface TelegramLink {
  privateChatUrl: string
  groupChatUrl: string
  expiresAt: string
}

export type TelegramPreferences = Partial<Pick<TelegramStatus, 'lowStockThreshold' | 'dailySummaryHour'>>

export type TelegramChatChanges = Partial<Pick<
  TelegramChat,
  'allStores' | 'storeIds' | 'khqrAlerts' | 'orderAlerts' | 'lowStockAlerts' | 'dailySummary'
>>

const chatPath = (businessId: number, chatId: number) =>
  `/businesses/${encodeURIComponent(businessId)}/telegram/chats/${encodeURIComponent(chatId)}`

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

  async updateChat(businessId: number, chatId: number, changes: TelegramChatChanges): Promise<TelegramStatus> {
    return requireData(
      await api.request<ApiEnvelope<TelegramStatus>>(chatPath(businessId, chatId), { method: 'PUT', body: JSON.stringify(changes) }),
      'The Telegram chat could not be saved.',
    )
  },

  async disconnectChat(businessId: number, chatId: number): Promise<TelegramStatus> {
    return requireData(
      await api.request<ApiEnvelope<TelegramStatus>>(chatPath(businessId, chatId), { method: 'DELETE' }),
      'The Telegram chat could not be disconnected.',
    )
  },

  async sendTest(businessId: number, chatId: number): Promise<void> {
    await api.request<ApiEnvelope<unknown>>(`${chatPath(businessId, chatId)}/test`, { method: 'POST' })
  },
}
