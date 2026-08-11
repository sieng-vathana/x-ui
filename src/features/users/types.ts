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
  memberships?: UserStoreMembership[]
}

export interface UserStoreMembership {
  storeId: number
  roleId: number
  roleCode: string
  roleName: string
}

export interface UserRole {
  id: number
  businessId: number
  roleCode: string
  roleName: string
  description?: string
  isSystem: boolean
  permissionCount: number
  createdAt?: string
}

export interface RolePermissionAccess {
  id: number
  permissionCode: string
  permissionName: string
  moduleName: string
  description?: string
  allowed: boolean
}

export interface UserRoleDetails extends Omit<UserRole, 'permissionCount' | 'createdAt'> {
  permissions: RolePermissionAccess[]
}

export interface CreateUserPayload {
  businessId: number
  roleId: number
  storeIds: number[]
  fullName: string
  username: string
  password: string
  email?: string
  phone?: string
  status?: number
}

export interface UpdateUserPayload {
  businessId: number
  roleId: number
  storeIds: number[]
  fullName?: string
  email?: string
  phone?: string
  password?: string
  status?: number
}
