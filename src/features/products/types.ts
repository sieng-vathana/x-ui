export interface ProductCategory {
  id: number
  businessId: number
  storeIds?: number[]
  categoryCode: string
  categoryName: string
  description?: string
  image?: string
  sortOrder?: number
  isFeatured?: boolean
  isGlobal?: boolean
  status?: string
}

export interface ProductUnit {
  id: number
  businessId: number
  storeIds?: number[]
  unitCode: string
  unitName: string
  description?: string
  isGlobal?: boolean
  status?: string
}

export interface ProductBrand {
  id: number
  businessId: number
  storeIds?: number[]
  brandCode: string
  brandName: string
  description?: string
  logo?: string
  isFeatured?: boolean
  isGlobal?: boolean
  status?: string
}

export interface ProductTax {
  id: number
  businessId: number
  storeIds?: number[]
  taxCode: string
  taxName: string
  description?: string
  percentage: number
  isDefault?: boolean
  isGlobal?: boolean
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
