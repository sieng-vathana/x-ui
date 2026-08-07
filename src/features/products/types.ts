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

export interface ProductSupplier {
  id: number
  businessId: number
  storeIds?: number[]
  supplierCode?: string
  supplierName: string
  phone?: string
  email?: string
  address?: string
  status?: string
}

export interface ProductAttribute {
  id: number
  businessId: number
  attributeName: string
}

export interface ProductAttributeValue {
  id: number
  attribute?: ProductAttribute
  value: string
}

export interface ProductVariant {
  id?: number
  sku: string
  barcode: string
  variantName?: string
  image?: string
  costPrice?: number
  posPrice?: number
  compareAtPrice?: number
  onlinePrice?: number
  supplier?: { id: number } | ProductSupplier
  stockAlertQty?: number
  isDefault?: boolean
}

export interface ProductItem {
  id: number
  storeId: number
  productCode: string
  productName: string
  shortName?: string
  currencyCode?: string
  salesChannel?: number | string
  thumbnail?: string
  description?: string
  category?: ProductCategory
  brand?: ProductBrand
  unit?: ProductUnit
  tax?: ProductTax
  isFeatured?: boolean
  isSellable?: boolean
  isStockable?: boolean
  status?: number | string
  variants?: ProductVariant[]
  images?: { imageUrl?: string }[]
}

export interface CreateProductPayload {
  storeId: number
  productCode?: string
  productName: string
  shortName?: string
  currencyCode?: string
  salesChannel?: number
  thumbnail?: string
  description?: string
  category?: { id: number }
  brand?: { id: number }
  unit?: { id: number }
  tax?: { id: number }
  isFeatured?: boolean
  isSellable?: boolean
  isStockable?: boolean
  variants?: Partial<ProductVariant>[]
  images?: { imageUrl: string }[]
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
