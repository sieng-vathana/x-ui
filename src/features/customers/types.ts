export interface CustomerAddress {
  id?: number
  addressName?: string
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
  isDefault?: boolean
}

export interface Customer {
  id: number
  userId?: number | null
  businessId: number
  storeId?: number | null
  customerCode: string
  fullName: string
  phone?: string | null
  email?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  note?: string | null
  status: number
  addresses?: CustomerAddress[]
  createdAt?: string
  updatedAt?: string
}

export interface CustomerPayload {
  businessId: number
  storeId?: number | null
  customerCode?: string
  fullName: string
  phone?: string
  email?: string
  gender?: string
  dateOfBirth?: string
  note?: string
  addresses?: CustomerAddress[]
}

export interface CustomerPage {
  content: Customer[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}
