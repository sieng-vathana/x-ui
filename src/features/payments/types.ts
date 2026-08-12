export type PaymentMethod = 'CASH' | 'QR'
export type PaymentProvider = 'NONE' | 'ABA' | 'ACLEDA' | 'BAKONG' | 'KHQRPAY' | 'OTHER'
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
  checkoutUrl?: string | null
  expiresAt?: string | null
  reused: boolean
}
