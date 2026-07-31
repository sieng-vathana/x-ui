import { API_BASE_URL } from '../../lib/api'
import type { FileResponse } from './types'

type ApiEnvelope<T> = { data?: T; message?: string }
const LEGACY_FILE_CONTENT_PATH = /^\/api\/v1\/files\/(\d+)\/content(?:\?.*)?$/

/** Prefer the storage service's browser-ready URL (AWS/public or presigned); use the BFF only as a fallback. */
export function fileUrl(file: FileResponse): string {
  const publicUrl = file.url?.trim()
  if (publicUrl) {
    if (/^(https?:|data:|blob:|\/)/i.test(publicUrl)) return publicUrl
    return `/${publicUrl}`
  }
  throw new Error('Storage did not return a browser-ready image URL.')
}

/** Resolves legacy BFF file-content paths to storage's direct AWS/public URL. */
export async function resolveImageUrl(imageUrl: string | undefined): Promise<string | undefined> {
  if (!imageUrl) return undefined
  const match = LEGACY_FILE_CONTENT_PATH.exec(imageUrl)
  if (!match) return imageUrl

  const response = await fetch(`${API_BASE_URL}/files/${match[1]}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return undefined
  const envelope = await response.json() as ApiEnvelope<FileResponse>
  return envelope.data?.url?.trim() || undefined
}

export const fileApi = {
  async upload(file: File): Promise<FileResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/files`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null
      throw new Error(payload?.message ?? 'File upload failed.')
    }

    const envelope = await response.json() as ApiEnvelope<FileResponse>
    if (!envelope.data) throw new Error(envelope.message ?? 'File upload failed.')
    return envelope.data
  },
}
