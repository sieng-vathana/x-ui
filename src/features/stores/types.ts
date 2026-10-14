export type MarketplaceStatus = 'NOT_LISTED' | 'PENDING_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED'

export type StoreDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface StoreDaySchedule {
  closed: boolean
  openTime: string | null
  closeTime: string | null
}

export interface StoreOpeningHours {
  timeZone: string
  days: Record<StoreDay, StoreDaySchedule>
}

export interface BffStore {
  id: number
  businessId: number
  name: string
  code: string
  storeType?: string
  addressLine1: string
  addressLine2: string | null
  landmark: string | null
  city: string
  stateProvince: string | null
  countryCode: string
  postalCode: string | null
  phone: string | null
  alternatePhone: string | null
  email: string | null
  website: string | null
  openingHours?: StoreOpeningHours | null
  latitude: number | null
  longitude: number | null
  images?: BffStoreImage[]
  status: number
  marketplaceStatus?: MarketplaceStatus
  marketplaceAppliedAt?: string | null
  marketplaceApprovedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}

export interface BffStoreImage {
  id: number
  imageUrl: string
  fileId?: number | null
  isPrimary: boolean
  sortOrder: number
}

export interface CreateStoreRequest {
  businessId: number
  name: string
  code: string
  storeType?: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  stateProvince?: string
  countryCode: string
  postalCode?: string
  phone?: string
  alternatePhone?: string
  email?: string
  website?: string
  latitude?: number | null
  longitude?: number | null
  images?: { imageUrl: string; isPrimary?: boolean; sortOrder?: number }[]
  openingHours?: StoreOpeningHours | null
}

export type UpdateStoreRequest = Omit<CreateStoreRequest, 'businessId'> & {
  status?: number
  clearOpeningHours?: boolean
}

