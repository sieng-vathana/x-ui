export type PaymentMethod = 'CASH' | 'QR' | 'CARD'
export type PaymentProvider = 'NONE' | 'ABA' | 'ACLEDA' | 'BAKONG' | 'KHQRPAY' | 'SIMULATED' | 'OTHER'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'PARTIALLY_REFUNDED' | 'REFUNDED'

export interface Payment {
  id: number
  orderId: number
  businessId: number
  storeId: number
  cashierId?: number | null
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

export interface RefundPaymentInput {
  amount: number
  reason?: string
}

export interface CreateCashPaymentInput {
  orderId: number
  businessId: number
  storeId: number
  cashierId: number
  amount: number
  tenderedAmount: number
  currencyCode: string
  method: 'CASH'
  provider: 'NONE'
  idempotencyKey: string
  note?: string
}

export interface PaymentBreakdown {
  method: PaymentMethod
  provider: PaymentProvider
  paymentCount: number
  totalAmount: number
  refundedAmount: number
}

export interface CreateCardPaymentInput {
  orderId: number
  businessId: number
  storeId: number
  cashierId: number
  amount: number
  currencyCode: string
  method: 'CARD'
  provider: 'OTHER'
  idempotencyKey: string
  note?: string
}

export interface CreateQrPaymentInput {
  orderId: number
  businessId: number
  storeId: number
  cashierId?: number
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

export type CashSessionStatus = 'OPEN' | 'CLOSED'
export type CashMovementType = 'PAY_IN' | 'PAY_OUT'

export interface CashMovement {
  id: number
  sessionId: number
  type: CashMovementType
  amount: number
  reason: string
  createdBy: number
  createdAt?: string
}

export interface CashSession {
  id: number
  businessId: number
  storeId: number
  cashierId: number
  currencyCode: string
  status: CashSessionStatus
  openingFloat: number
  cashSales: number
  cashRefunds: number
  cashIn: number
  cashOut: number
  paymentCount: number
  expectedCash: number
  countedCash?: number | null
  variance?: number | null
  openedAt?: string
  closedAt?: string | null
  openedBy: number
  closedBy?: number | null
  note?: string | null
  closeNote?: string | null
  movements: CashMovement[]
}

export interface OpenCashSessionInput {
  businessId: number
  storeId: number
  cashierId: number
  currencyCode: string
  openingFloat: number
  note?: string
}

export interface CashMovementInput {
  type: CashMovementType
  amount: number
  reason: string
  createdBy: number
}

export interface CloseCashSessionInput {
  countedCash: number
  closedBy: number
  closeNote?: string
}
