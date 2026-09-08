export type DeliveryProviderType = 'GRAB' | 'VIREAK_BUNTHAM' | 'OWN_RIDER'

export type DeliveryStatus =
  | 'PENDING_ASSIGNMENT'
  | 'BOOKING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT'
  | 'RETURNED'
  | 'CANCELLED'

export interface Delivery {
  id: number
  orderId: number
  storeId: number
  providerType: DeliveryProviderType
  status: DeliveryStatus
  trackingNumber?: string | null
  riderName?: string | null
  riderPhone?: string | null
  deliveryFee?: number | null
  courierCost?: number | null
  codAmount?: number | null
  remittedAmount?: number | null
  remittedAt?: string | null
  createdAt?: string | null
}

export interface DeliveryQuote {
  quoteId: number
  storeId: number
  providerType: DeliveryProviderType
  providerName: string
  quotedFee: number
  courierCost: number
  estimatedMinutes?: number
  currencyCode: string
  expiresAt: string
}

export interface CreateDeliveryQuoteInput {
  orderId?: number
  storeId: number
  currencyCode: string
  receiverName: string
  receiverPhone: string
  streetAddress: string
  provinceCity?: string
  district?: string
  commune?: string
  latitude?: number
  longitude?: number
  itemTotal?: number
  isCod?: boolean
}

export interface CreateDeliveryInput {
  orderId: number
  storeId: number
  quoteId: number
  providerType: DeliveryProviderType
  riderName?: string
  riderPhone?: string
  idempotencyKey?: string
}

export interface UpdateDeliveryStatusInput {
  id: number
  status: DeliveryStatus
  failureReason?: string
}

export interface RecordRemittanceInput {
  id: number
  remittedAmount: number
}

export interface DeliveryFilters {
  storeId?: string | number
  orderId?: number
  status?: string
  providerType?: string
  search?: string
  page?: number
  size?: number
}

export interface DeliveryPage {
  content: Delivery[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}
