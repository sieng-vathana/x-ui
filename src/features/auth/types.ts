export interface BusinessProfile {
  id: string
  name: string
  logoUrl?: string
  /** Backend business code, shown as a compact workspace label. */
  type: string
  phone: string
  address: string
}

export interface AuthenticatedUser {
  id: string
  name: string
  username: string
  email?: string
  role: string
  permissions: string[]
  business: BusinessProfile
}

export interface SignInInput {
  username: string
  password: string
}

export interface RegistrationInput {
  fullName: string
  username: string
  password: string
  email?: string
  phone?: string
  businessName: string
  businessCode: string
  defaultCurrencyCode: string
  taxRegistrationNumber?: string
  taxRegistrationLabel?: string
  pricesIncludeTax: boolean
  timeZone: string
  fiscalYearStartMonth: number
  storeName: string
  storeCode: string
  storeAddressLine1: string
  storeCity: string
  storeCountryCode: string
  storeLatitude?: number
  storeLongitude?: number
}
