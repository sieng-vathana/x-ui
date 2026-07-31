export interface FileResponse {
  id: number
  originalName: string
  contentType: string
  sizeBytes: number
  url: string
  relativePath: string
  storageKind: string
  storageBackend: string
  ownerType: string | null
  ownerId: string | null
  createdAt: string
}
