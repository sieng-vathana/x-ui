import type { RolePermissionAccess, UserRole, UserRoleDetails } from '../users/types'

export type RoleSummary = UserRole
export type RoleDetails = UserRoleDetails

export type PermissionCatalogItem = Omit<RolePermissionAccess, 'allowed'>

export interface RolePayload {
  businessId: number
  roleName: string
  roleCode?: string
  description?: string
  permissionIds: number[]
}
