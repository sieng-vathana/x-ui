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
  taxRegistrationNumber?: string
  taxRegistrationLabel?: string
  usdToKhrExchangeRate?: number
  pricesIncludeTax?: boolean
  bakongAccountId?: string | null
  timeZone: string
}
export type ExchangeRateReference = {
  baseCurrency: string
  targetCurrency: string
  rate: number
  rateDate: string
  fetchedAt: string
  provider: string
  stale: boolean
}
type BackendAuthResponse = {
  user?: BackendUser
  business?: BackendBusiness
  stores?: BffStore[]
  mfaRequired?: boolean
  mfaMethod?: string
  mfaChallengeToken?: string
  mfaExpiresAt?: string
  mfaDestination?: string
}
type BrandCache = { businessId: string; name: string; logoUrl?: string }

export type AuthenticatedSession = {
  user: AuthenticatedUser
  stores?: BffStore[]
}

export class MfaRequiredError extends Error {
  readonly challengeToken: string
  readonly expiresAt?: string
  readonly method: 'EMAIL' | 'TELEGRAM'
  readonly destination?: string

  constructor(challengeToken: string, method: 'EMAIL' | 'TELEGRAM', expiresAt?: string, destination?: string) {
    super(method === 'EMAIL' ? 'Enter the email code to finish signing in.' : 'Enter the Telegram code to finish signing in.')
    this.name = 'MfaRequiredError'
    this.challengeToken = challengeToken
    this.expiresAt = expiresAt
    this.method = method
    this.destination = destination
  }
}

function asUser(source: BackendUser, business?: BackendBusiness): AuthenticatedUser {
  const backendBusiness: BusinessProfile = business
    ? {
        id: String(business.id),
        name: business.name,
        type: business.code,
        phone: '',
        address: business.timeZone,
        taxRegistrationNumber: business.taxRegistrationNumber,
        taxRegistrationLabel: business.taxRegistrationLabel,
        defaultCurrencyCode: business.defaultCurrencyCode || 'USD',
        usdToKhrExchangeRate: Number(business.usdToKhrExchangeRate ?? 4000),
        usdToKhrExchangeRateConfigured: Number(business.usdToKhrExchangeRate ?? 0) > 0,
        pricesIncludeTax: business.pricesIncludeTax ?? true,
        bakongAccountId: business.bakongAccountId || undefined,
      }
    : {
        id: 'workspace',
        name: 'TinhLuk workspace',
        type: 'WORKSPACE',
        phone: '',
        address: '',
        defaultCurrencyCode: 'USD',
        usdToKhrExchangeRate: 4000,
        usdToKhrExchangeRateConfigured: false,
        pricesIncludeTax: true,
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
  async getExchangeRateReference(businessId: string): Promise<ExchangeRateReference> {
    const response = await api.request<ApiEnvelope<ExchangeRateReference>>(
      `/businesses/${businessId}/exchange-rate-reference`,
    )
    if (!response.data) throw new Error(response.message || 'No exchange-rate reference is available.')
    return response.data
  },

  async refreshExchangeRateReference(businessId: string): Promise<ExchangeRateReference> {
    const response = await api.request<ApiEnvelope<ExchangeRateReference>>(
      `/businesses/${businessId}/exchange-rate-reference/refresh`,
      { method: 'POST' },
    )
    if (!response.data) throw new Error(response.message || 'The exchange-rate reference could not be refreshed.')
    return response.data
  },

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
    if (response.data?.mfaRequired && response.data.mfaChallengeToken) {
      throw new MfaRequiredError(response.data.mfaChallengeToken,
        response.data.mfaMethod === 'EMAIL' ? 'EMAIL' : 'TELEGRAM', response.data.mfaExpiresAt, response.data.mfaDestination)
    }
    if (!response.data?.user) throw new Error(response.message || 'The sign-in response did not include a user.')
    return asSession(response.data)
  },

  async verifyMfaSignIn(input: { username: string; challengeToken: string; code: string; method: 'EMAIL' | 'TELEGRAM' }): Promise<AuthenticatedSession> {
    const endpoint = input.method === 'EMAIL' ? '/auth/verify-email' : '/auth/verify-telegram'
    const { method: _method, ...request } = input
    const response = await api.request<ApiEnvelope<BackendAuthResponse>>(endpoint, {
      method: 'POST',
      headers: { 'X-Client-Type': 'web' },
      body: JSON.stringify(request),
    })
    if (!response.data?.user) throw new Error(response.message || 'The Telegram code could not be verified.')
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

  async updateBusiness(input: {
    businessId: string
    name: string
    logoUrl?: string
    defaultCurrencyCode?: string
    usdToKhrExchangeRate?: number
    pricesIncludeTax?: boolean
    taxRegistrationNumber?: string
    taxRegistrationLabel?: string
    bakongAccountId?: string
  }): Promise<BusinessProfile> {
    const response = await api.request<ApiEnvelope<BackendBusiness & { id: number; name: string; code: string }>>(
      `/businesses/${input.businessId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name: input.name,
          ...(input.defaultCurrencyCode ? { defaultCurrencyCode: input.defaultCurrencyCode } : {}),
          ...(input.usdToKhrExchangeRate !== undefined ? { usdToKhrExchangeRate: input.usdToKhrExchangeRate } : {}),
          ...(input.pricesIncludeTax !== undefined ? { pricesIncludeTax: input.pricesIncludeTax } : {}),
          ...(input.taxRegistrationNumber !== undefined ? { taxRegistrationNumber: input.taxRegistrationNumber } : {}),
          ...(input.taxRegistrationLabel !== undefined ? { taxRegistrationLabel: input.taxRegistrationLabel } : {}),
          ...(input.bakongAccountId !== undefined ? { bakongAccountId: input.bakongAccountId } : {}),
        }),
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
      taxRegistrationNumber: response.data.taxRegistrationNumber,
      taxRegistrationLabel: response.data.taxRegistrationLabel,
      defaultCurrencyCode: response.data.defaultCurrencyCode || 'USD',
      usdToKhrExchangeRate: Number(response.data.usdToKhrExchangeRate ?? 4000),
      usdToKhrExchangeRateConfigured: Number(response.data.usdToKhrExchangeRate ?? 0) > 0,
      pricesIncludeTax: response.data.pricesIncludeTax ?? true,
      bakongAccountId: response.data.bakongAccountId || undefined,
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
