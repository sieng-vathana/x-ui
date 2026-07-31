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

/** Direct gateway API boundary — the UI does not use a Vite development proxy. */
const API_GATEWAY_URL = (import.meta.env.VITE_API_GATEWAY_URL?.trim() || 'http://localhost:7555').replace(/\/$/, '')
export const API_BASE_URL = `${API_GATEWAY_URL}/api/v1`

export function isPlatformApiRequest(input: RequestInfo | URL) {
  const requestUrl = input instanceof Request ? input.url : input.toString()
  const apiUrl = new URL(API_BASE_URL, window.location.origin)
  const targetUrl = new URL(requestUrl, window.location.origin)
  return targetUrl.origin === apiUrl.origin && (targetUrl.pathname === apiUrl.pathname || targetUrl.pathname.startsWith(`${apiUrl.pathname}/`))
}

/**
 * Transport boundary for future backend endpoints. Feature modules depend on
 * this contract instead of calling fetch directly, making the local demo
 * adapter straightforward to replace with the real API later.
 */
export class ApiClient {
  private readonly options: ApiClientOptions
  constructor(options: ApiClientOptions = {}) {
    this.options = options
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.options.getToken?.()
    const response = await fetch(`${this.options.baseUrl ?? ''}${path}`, {
      ...init,
      credentials: init.credentials ?? 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null
      const detail = payload?.message ?? await response.text().catch(() => '')
      throw new ApiError(detail || 'The request could not be completed.', response.status)
    }

    return response.status === 204
      ? (undefined as T)
      : (response.json() as Promise<T>)
  }
}
