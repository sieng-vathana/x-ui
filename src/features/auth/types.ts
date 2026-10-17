export interface BusinessProfile {
  id: string
  name: string
  logoUrl?: string
  /** Backend business code, shown as a compact workspace label. */
  type: string
  phone: string
  address: string
  taxRegistrationNumber?: string
  taxRegistrationLabel?: string
  defaultCurrencyCode: string
  usdToKhrExchangeRate: number
  usdToKhrExchangeRateConfigured: boolean
  pricesIncludeTax: boolean
  /** Bakong account that receives POS KHQR payments, e.g. shopname@aclb. */
  bakongAccountId?: string
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
  taxRegistrationNumber?: string
  taxRegistrationLabel?: string
  defaultCurrencyCode: string
  usdToKhrExchangeRate: number
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
