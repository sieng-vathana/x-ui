export class ApiError extends Error {
  public readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export interface ApiClientOptions {
  baseUrl?: string
  getToken?: () => string | undefined
}

/**
 * Production uses the UI server's same-origin /api proxy. This keeps each
 * application action to one browser request instead of adding a CORS preflight.
 */
const API_GATEWAY_URL = (import.meta.env.DEV
  ? import.meta.env.VITE_API_GATEWAY_URL?.trim() || 'http://localhost:7555'
  : '').replace(/\/$/, '')
export const API_BASE_URL = `${API_GATEWAY_URL}/api/v1`

export function isPlatformApiRequest(input: RequestInfo | URL) {
  const requestUrl = input instanceof Request ? input.url : input.toString()
  const apiUrl = new URL(API_BASE_URL, window.location.origin)
  const targetUrl = new URL(requestUrl, window.location.origin)
  return targetUrl.origin === apiUrl.origin && (targetUrl.pathname === apiUrl.pathname || targetUrl.pathname.startsWith(`${apiUrl.pathname}/`))
}

export function resolveImageUrl(url?: string): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  if (url.startsWith('/')) {
    return `${API_GATEWAY_URL}${url}`
  }
  return `${API_GATEWAY_URL}/${url}`
}

let refreshPromise: Promise<boolean> | null = null

/**
 * Transport boundary for backend endpoints.
 * Includes automatic single-flight silent token refresh on HTTP 401 status.
 */
export class ApiClient {
  private readonly options: ApiClientOptions
  constructor(options: ApiClientOptions = {}) {
    this.options = options
  }

  private async refreshSession(): Promise<boolean> {
    if (!refreshPromise) {
      const baseUrl = this.options.baseUrl ?? API_BASE_URL
      refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'X-Client-Type': 'web',
        },
      })
        .then((res) => res.ok)
        .catch(() => false)
        .finally(() => {
          refreshPromise = null
        })
    }
    return refreshPromise
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.options.getToken?.()
    const url = `${this.options.baseUrl ?? ''}${path}`
    const isAuthRequest = path.startsWith('/auth/login') || path.startsWith('/auth/refresh') || path.startsWith('/auth/register')

    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData

    const response = await fetch(url, {
      ...init,
      credentials: init.credentials ?? 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })

    if (response.status === 401 && !isAuthRequest) {
      const refreshed = await this.refreshSession()
      if (refreshed) {
        // Retry the original request after successful token rotation
        return this.request<T>(path, init)
      } else {
        // Session expired (refresh_token invalid or expired) -> notify app
        window.dispatchEvent(new CustomEvent('vpos:session-expired'))
        throw new ApiError('Your session has expired. Please sign in again.', 401)
      }
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      const detail = payload?.message ?? (await response.text().catch(() => ''))
      throw new ApiError(detail || 'The request could not be completed.', response.status)
    }

    return response.status === 204
      ? (undefined as T)
      : (response.json() as Promise<T>)
  }
}
