export type OrderDiscountType = 'PERCENTAGE' | 'FIXED'

export interface PosOrderItemInput {
  variantId: number
  quantity: number
  discountType?: OrderDiscountType
  discountValue?: number
  discountReason?: string
}

export interface CreatePosOrderInput {
  businessId: number
  storeId: number
  customerId: number
  cashierId: number
  currencyCode: string
  taxRate?: number
  idempotencyKey: string
  items: PosOrderItemInput[]
}

export interface OrderItem {
  id: number
  productId: number
  variantId: number
  productName: string
  variantName?: string
  sku?: string
  barcode?: string
  qty?: number
  quantity?: number
  unitPrice: number
  total: number
}

export interface PosOrder {
  id: number
  orderNo: string
  businessId: number
  storeId: number
  customerId: number
  cashierId: number
  orderChannel?: string
  paymentMethod?: string | null
  orderStatus: string
  paymentStatus: string
  currencyCode: string
  subtotal: number
  discount: number
  tax: number
  grandTotal: number
  items: OrderItem[]
  createdAt?: string
  completedAt?: string
}

export interface OrderPage {
  content: PosOrder[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}
