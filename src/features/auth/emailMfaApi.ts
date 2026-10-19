import { API_BASE_URL, ApiClient } from '../../lib/api'

const api = new ApiClient({ baseUrl: API_BASE_URL })
type ApiEnvelope<T> = { data?: T; message?: string }

export type EmailMfaStatus = {
  mailConfigured: boolean
  emailAvailable: boolean
  verified: boolean
  enabled: boolean
  maskedEmail?: string | null
}

export const emailMfaApi = {
  async status(): Promise<EmailMfaStatus> {
    const response = await api.request<ApiEnvelope<EmailMfaStatus>>('/auth/security/email-mfa')
    if (!response.data) throw new Error(response.message || 'Email security settings could not be loaded.')
    return response.data
  },

  async startVerification(currentPassword: string): Promise<{ challengeToken: string; expiresAt: string; maskedEmail: string }> {
    const response = await api.request<ApiEnvelope<{ challengeToken: string; expiresAt: string; maskedEmail: string }>>(
      '/auth/security/email-mfa/verification',
      { method: 'POST', body: JSON.stringify({ currentPassword }) },
    )
    if (!response.data) throw new Error(response.message || 'An email verification code could not be sent.')
    return response.data
  },

  async confirmVerification(challengeToken: string, code: string): Promise<EmailMfaStatus> {
    const response = await api.request<ApiEnvelope<EmailMfaStatus>>('/auth/security/email-mfa/verification/confirm', {
      method: 'POST', body: JSON.stringify({ challengeToken, code }),
    })
    if (!response.data) throw new Error(response.message || 'The email code could not be verified.')
    return response.data
  },

  async setEnabled(enabled: boolean, currentPassword: string): Promise<EmailMfaStatus> {
    const response = await api.request<ApiEnvelope<EmailMfaStatus>>('/auth/security/email-mfa', {
      method: 'PUT', body: JSON.stringify({ enabled, currentPassword }),
    })
    if (!response.data) throw new Error(response.message || 'Email 2FA could not be updated.')
    return response.data
  },

  async disconnect(currentPassword: string): Promise<EmailMfaStatus> {
    const response = await api.request<ApiEnvelope<EmailMfaStatus>>('/auth/security/email-mfa/disconnect', {
      method: 'POST', body: JSON.stringify({ currentPassword }),
    })
    if (!response.data) throw new Error(response.message || 'Email 2FA could not be disconnected.')
    return response.data
  },
}
