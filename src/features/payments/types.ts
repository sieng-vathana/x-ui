export type PaymentMethod = 'CASH' | 'QR'
export type PaymentProvider = 'NONE' | 'ABA' | 'ACLEDA' | 'BAKONG' | 'KHQRPAY' | 'SIMULATED' | 'OTHER'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'PARTIALLY_REFUNDED' | 'REFUNDED'

export interface Payment {
  id: number
  orderId: number
  businessId: number
  storeId: number
  amount: number
  tenderedAmount?: number | null
  changeAmount: number
  refundedAmount: number
  currencyCode: string
  method: PaymentMethod
  provider: PaymentProvider
  status: PaymentStatus
  externalReference?: string | null
  idempotencyKey: string
  note?: string | null
  paidAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCashPaymentInput {
  orderId: number
  businessId: number
  storeId: number
  amount: number
  tenderedAmount: number
  currencyCode: string
  method: 'CASH'
  provider: 'NONE'
  idempotencyKey: string
  note?: string
}

export interface CreateQrPaymentInput {
  orderId: number
  businessId: number
  storeId: number
  amount: number
  currencyCode: string
  idempotencyKey: string
  note?: string
}

export interface QrPaymentResponse {
  payment: Payment
  transactionId: string
  qrPayload?: string | null
  qrImageUrl?: string | null
  qrImageDataUrl?: string | null
  checkoutUrl?: string | null
  expiresAt?: string | null
  reused: boolean
}

export interface CreatePosQrCheckoutInput {
  businessId: number
  storeId: number
  customerId: number
  cashierId: number
  currencyCode: string
  taxRate?: number
  idempotencyKey: string
  paymentIdempotencyKey: string
  paymentNote?: string
  items: Array<{
    variantId: number
    quantity: number
    discountType?: 'PERCENTAGE' | 'FIXED'
    discountValue?: number
    discountReason?: string
  }>
}

export interface PosQrCheckoutResponse {
  order: import('../orders/types').PosOrder
  payment: QrPaymentResponse
}
