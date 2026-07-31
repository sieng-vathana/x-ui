import { API_BASE_URL, ApiClient } from '../../lib/api'
import { readStoredValue, removeStoredValue, writeStoredValue } from '../../lib/storage'
import type {
  AuthenticatedUser,
  BusinessProfile,
  RegistrationInput,
  SignInInput,
} from './types'
import type { BffStore } from '../stores/types'

const BRAND_CACHE_KEY = 'vpos.ui.business-brand.v1'
const LEGACY_AUTH_CACHE_KEY = 'vpos.auth.user.v1'
const api = new ApiClient({ baseUrl: API_BASE_URL })

type ApiEnvelope<T> = { data?: T; message?: string }
type BackendUser = { id: number; username: string; fullName?: string; permissions?: string[] }
type BackendBusiness = {
  id: number
  name: string
  code: string
  defaultCurrencyCode: string
  timeZone: string
}
type BackendAuthResponse = { user?: BackendUser; business?: BackendBusiness; stores?: BffStore[] }
type BrandCache = { businessId: string; name: string; logoUrl?: string }

export type AuthenticatedSession = {
  user: AuthenticatedUser
  stores?: BffStore[]
}

function asUser(source: BackendUser, business?: BackendBusiness): AuthenticatedUser {
  const backendBusiness: BusinessProfile = business
    ? {
        id: String(business.id),
        name: business.name,
        type: business.code,
        phone: '',
        address: business.timeZone,
      }
    : {
        id: 'workspace',
        name: 'V-POS workspace',
        type: 'WORKSPACE',
        phone: '',
        address: '',
      }
  const brand = readStoredValue<BrandCache | null>(BRAND_CACHE_KEY, null)
  const selectedBusiness = brand?.businessId === backendBusiness.id
    ? { ...backendBusiness, name: brand.name, logoUrl: brand.logoUrl }
    : backendBusiness

  return {
    id: String(source.id),
    name: source.fullName || source.username,
    username: source.username,
    role: source.permissions?.includes('x-business:create') ? 'Business owner' : 'Workspace user',
    permissions: source.permissions ?? [],
    business: selectedBusiness,
  }
}

function asSession(response: BackendAuthResponse): AuthenticatedSession {
  if (!response.user) throw new Error('The authentication response did not include a user.')
  return {
    user: asUser(response.user, response.business),
    stores: response.stores,
  }
}

/** Browser client for the BFF's HttpOnly cookie authentication endpoints. */
export const authApi = {
  async restore(): Promise<AuthenticatedSession | null> {
    try {
      const response = await api.request<ApiEnvelope<BackendAuthResponse>>('/auth/refresh', {
        method: 'POST',
        headers: { 'X-Client-Type': 'web' },
      })
      return response.data?.user ? asSession(response.data) : null
    } catch {
      return null
    }
  },

  async signIn(input: SignInInput): Promise<AuthenticatedSession> {
    const username = input.username.trim()
    if (!username || !input.password) throw new Error('Enter your username and password.')

    const response = await api.request<ApiEnvelope<BackendAuthResponse>>('/auth/login', {
      method: 'POST',
      headers: { 'X-Client-Type': 'web' },
      body: JSON.stringify({ username, password: input.password }),
    })
    if (!response.data?.user) throw new Error(response.message || 'The sign-in response did not include a user.')
    return asSession(response.data)
  },

  async register(input: RegistrationInput): Promise<AuthenticatedSession> {
    const response = await api.request<ApiEnvelope<BackendAuthResponse>>('/auth/register', {
      method: 'POST',
      headers: { 'X-Client-Type': 'web' },
      body: JSON.stringify(input),
    })
    if (!response.data?.user) throw new Error(response.message || 'The registration response did not include a user.')
    return asSession(response.data)
  },

  updateUser(user: AuthenticatedUser): AuthenticatedUser {
    // Branding is presentation state only; authentication is held by HttpOnly BFF cookies.
    writeStoredValue<BrandCache>(BRAND_CACHE_KEY, {
      businessId: user.business.id,
      name: user.business.name,
      logoUrl: user.business.logoUrl,
    })
    return user
  },

  async updateBusiness(input: { businessId: string; name: string; logoUrl?: string }): Promise<BusinessProfile> {
    const response = await api.request<ApiEnvelope<{ id: number; name: string; code: string; defaultCurrencyCode: string; timeZone: string }>>(
      `/businesses/${input.businessId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ name: input.name }),
      },
    )
    if (!response.data) throw new Error(response.message || 'Failed to update business.')
    writeStoredValue<BrandCache>(BRAND_CACHE_KEY, {
      businessId: input.businessId,
      name: response.data.name,
      logoUrl: input.logoUrl,
    })
    return {
      id: String(response.data.id),
      name: response.data.name,
      type: response.data.code,
      phone: '',
      address: response.data.timeZone,
      logoUrl: input.logoUrl,
    }
  },

  async signOut(): Promise<void> {
    try {
      await api.request<ApiEnvelope<void>>('/auth/logout', {
        method: 'POST',
        headers: { 'X-Client-Type': 'web' },
      })
    } finally {
      removeStoredValue(LEGACY_AUTH_CACHE_KEY)
    }
  },
}
