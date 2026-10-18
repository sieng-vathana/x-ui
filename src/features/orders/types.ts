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
  roundingIncrement?: number
  allowNegativeStock?: boolean
  /** Points the selected customer spends as an order discount. */
  loyaltyPointsToRedeem?: number
}

export interface CreateHeldSaleInput {
  businessId: number
  storeId: number
  customerId: number
  cashierId: number
  currencyCode: string
  taxRate?: number
  note?: string
  idempotencyKey: string
  items: PosOrderItemInput[]
  roundingIncrement?: number
  allowNegativeStock?: boolean
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
  discountType?: OrderDiscountType | null
  discountValue?: number | null
  discountAmount?: number | null
  orderDiscountAmount?: number | null
  taxAmount?: number | null
  total: number
}

export type FulfillmentType = 'CUSTOMER_PICKUP' | 'OWN_RIDER' | 'THIRD_PARTY'
export type OrderChannelType = 'POS' | 'ONLINE'

export interface DeliveryAddress {
  receiverName?: string
  phone?: string
  provinceCity?: string
  district?: string
  commune?: string
  village?: string
  streetAddress?: string
  landmark?: string
  deliveryInstructions?: string
  latitude?: number
  longitude?: number
}

export interface PosOrder {
  id: number
  orderNo: string
  businessId: number
  storeId: number
  customerId: number
  cashierId: number
  orderChannel?: OrderChannelType | string
  paymentMethod?: string | null
  orderStatus: string
  paymentStatus: string
  currencyCode: string
  subtotal: number
  discount: number
  tax: number
  deliveryFee?: number | null
  grandTotal: number
  fulfillmentType?: FulfillmentType | null
  deliveryAddress?: DeliveryAddress | null
  note?: string | null
  items: OrderItem[]
  createdAt?: string
  completedAt?: string
  loyaltyPointsRedeemed?: number | null
  loyaltyPointsEarned?: number | null
}

export interface OrderFilters {
  storeId?: string | number
  channel?: string
  status?: string
  fulfillmentType?: string
  search?: string
  page?: number
  size?: number
}

export interface OrderPage {
  content: PosOrder[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface SalesSummary {
  orderCount: number
  subtotal: number
  discount: number
  tax: number
  grandTotal: number
}

export interface SalesTrend {
  date: string
  orderCount: number
  grandTotal: number
}

export interface TopProduct {
  variantId: number
  productName: string
  sku?: string | null
  quantity: number
  salesAmount: number
}
