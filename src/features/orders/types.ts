export type OrderDiscountType = 'PERCENTAGE' | 'FIXED'
export type PaymentMethod = 'CASH' | 'QR'
export type PaymentProvider = 'NONE' | 'BAKONG'

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
  qty: number
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
  orderStatus: string
  paymentStatus: string
  currencyCode: string
  subtotal: number
  discount: number
  tax: number
  grandTotal: number
  items: OrderItem[]
}

export interface CreatePaymentInput {
  orderId: number
  businessId: number
  storeId: number
  amount: number
  tenderedAmount?: number
  currencyCode: string
  method: PaymentMethod
  provider: PaymentProvider
  idempotencyKey: string
  note?: string
}

export interface Payment {
  id: number
  orderId: number
  amount: number
  status: 'PAID' | 'PENDING' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  method: PaymentMethod
}

