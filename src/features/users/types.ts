export interface User {
  id: number
  username: string
  fullName: string
  gender?: string
  phone?: string
  email?: string
  profileImage?: string
  status: number // 1 = Active, 0 = Inactive, 2 = Suspended
  lastLogin?: string
  createdAt?: string
  updatedAt?: string
  role?: string
  roles?: string[]
  stores?: { id: number; name: string }[]
}

export interface UserRole {
  id: number
  roleCode: string
  roleName: string
  description?: string
}

export interface CreateUserPayload {
  fullName: string
  username: string
  password?: string
  email?: string
  phone?: string
  status?: number
  role?: string
  storeIds?: number[]
}

export interface UpdateUserPayload {
  fullName?: string
  email?: string
  phone?: string
  password?: string
  status?: number
  role?: string
  storeIds?: number[]
}
