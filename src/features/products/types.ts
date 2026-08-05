export interface ProductCategory {
  id: number
  businessId: number
  storeIds?: number[]
  categoryCode: string
  categoryName: string
  image?: string
  sortOrder?: number
  status?: string
}

export interface ProductUnit {
  id: number
  businessId: number
  storeIds?: number[]
  unitCode: string
  unitName: string
  status?: string
}

export interface ProductBrand {
  id: number
  businessId: number
  storeIds?: number[]
  brandCode: string
  brandName: string
  logo?: string
  status?: string
}

export interface PageEnvelope<T> {
  content?: T[]
  pageNumber?: number
  pageSize?: number
  totalElements?: number
  totalPages?: number
  hasNext?: boolean
}

export interface ApiEnvelope<T> {
  status?: number
  message?: string
  data?: T
}
