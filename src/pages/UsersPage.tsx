import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb, Button, ConfirmModal, DataTable, Icon, Select, StoreSwitcher, Topbar, type DataTableColumn } from '../components'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '../features/users/useUsers'
import { useRoleDetails, useRoles } from '../features/roles/useRoles'
import type { CreateUserPayload, UpdateUserPayload, User, UserRole } from '../features/users/types'
import { UserModal } from '../components/ui/UserModal'
import { RolePermissionsModal } from '../components/ui/RolePermissionsModal'
import { useToast } from '../context/ToastContext'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import { useAuth } from '../context/AuthContext'
import { useStores } from '../features/stores/useStores'
import { useAdminStore } from '../hooks/useAdminStore'
import { pageContent } from '../lib/ui'

function roleCodes(user: User): string[] {
  const codes = user.roles?.filter(Boolean) ?? []
  if (codes.length > 0) return codes
  if (user.role) return [user.role]
  return []
}

function roleTone(role?: string): string {
  switch (role?.toUpperCase()) {
    case 'OWNER':
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'MANAGER':
    case 'STORE_MANAGER':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'CASHIER':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'INVENTORY_MANAGER':
      return 'bg-teal-100 text-teal-800 border-teal-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function UsersPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const { user: authenticatedUser } = useAuth()
  const businessId = Number(authenticatedUser?.business.id)
  const permissions = authenticatedUser?.permissions ?? []
  const canCreate = permissions.includes('x-user:create')
  const canUpdate = permissions.includes('x-user:update')
  const canDelete = permissions.includes('x-user:delete')
  const { data: users = [], isLoading } = useUsers()
  const { data: roles = [] } = useRoles()
  const { data: stores = [] } = useStores()
  const rolesByCode = useMemo(
    () => new Map(roles.map((role) => [role.roleCode.toUpperCase(), role])),
    [roles],
  )
  const roleFilterOptions = useMemo(
    () => [
      { value: 'All roles', label: 'All roles' },
      ...roles.map((role) => ({ value: role.roleCode, label: role.roleName })),
    ],
    [roles],
  )

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All roles')
  const [statusFilter, setStatusFilter] = useState('All status')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const roleDetailsQuery = useRoleDetails(selectedRole?.id ?? null)

  // Metrics
  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.status === 1).length
  const managersCashiers = users.filter((u) => {
    return roleCodes(u).some((role) => {
      const code = role.toUpperCase()
      return code === 'MANAGER' || code === 'CASHIER'
    })
  }).length
  const inactiveUsers = users.filter((u) => u.status === 0 || u.status === 2).length

  // Filtered rows
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (
        roleFilter !== 'All roles' &&
        !roleCodes(u).some((role) => role.toUpperCase() === roleFilter.toUpperCase())
      ) {
        return false
      }
      if (statusFilter === 'Active' && u.status !== 1) return false
      if (statusFilter === 'Inactive' && u.status === 1) return false

      if (search) {
        const q = search.toLowerCase()
        const matchName = u.fullName?.toLowerCase().includes(q)
        const matchUser = u.username?.toLowerCase().includes(q)
        const matchEmail = u.email?.toLowerCase().includes(q)
        const matchPhone = u.phone?.toLowerCase().includes(q)
        return matchName || matchUser || matchEmail || matchPhone
      }
      return true
    })
  }, [users, roleFilter, statusFilter, search])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (user: User) => {
    if (roleCodes(user).some((role) => role.toUpperCase() === 'OWNER')) return
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleSaveUser = async (payload: CreateUserPayload | UpdateUserPayload) => {
    try {
      if (editingUser) {
        await updateUserMutation.mutateAsync({ id: editingUser.id, payload: payload as UpdateUserPayload })
        toast('User updated successfully!', 'success')
      } else {
        await createUserMutation.mutateAsync(payload as CreateUserPayload)
        toast('User account created successfully!', 'success')
      }
      setModalOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save user.'
      toast(msg, 'error')
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return
    try {
      await deleteUserMutation.mutateAsync(deletingUser.id)
      toast(`User ${deletingUser.fullName || deletingUser.username} deleted successfully.`, 'success')
      setDeletingUser(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user.'
      toast(msg, 'error')
    }
  }

  const columns: DataTableColumn<User>[] = useMemo(
    () => [
      {
        id: 'user',
        header: 'User Profile',
        cell: (u) => {
          const initials = (u.fullName || u.username || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
          return (
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-vpos-primary/10 text-[13px] font-extrabold text-vpos-primary">
                {initials}
              </div>
              <div>
                <strong className="block text-[13px] font-bold text-vpos-dark">
                  {u.fullName || u.username}
                </strong>
                <span className="block text-[11px] text-vpos-muted">
                  {u.email || u.phone || `@${u.username}`}
                </span>
              </div>
            </div>
          )
        },
      },
      {
        id: 'username',
        header: 'Username',
        cell: (u) => <code className="rounded bg-vpos-subtle px-2 py-1 text-[12px] font-semibold text-vpos-text">@{u.username}</code>,
      },
      {
        id: 'role',
        header: 'Role',
        cell: (u) => {
          const codes = roleCodes(u)
          if (codes.length === 0) {
            return (
              <span className="inline-block rounded-md border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[11px] font-extrabold text-gray-800 shadow-2xs">
                Unassigned
              </span>
            )
          }
          return (
            <div className="flex flex-wrap gap-1.5">
              {codes.map((code) => {
                const role = rolesByCode.get(code.toUpperCase())
                const label = role?.roleName || code
                return role ? (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs transition hover:-translate-y-px hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary',
                      roleTone(code),
                    )}
                    title={`View ${label} permissions`}
                    aria-label={`View ${label} permissions`}
                  >
                    {label}
                    <Icon name="arrow-right-s-line" />
                  </button>
                ) : (
                  <span
                    key={code}
                    className={cn(
                      'inline-block rounded-md border px-2.5 py-0.5 text-[11px] font-extrabold shadow-2xs',
                      roleTone(code),
                    )}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: (u) => (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold',
              u.status === 1
                ? 'bg-vpos-green-bg text-vpos-green'
                : 'bg-vpos-red-bg text-vpos-red',
            )}
          >
            ● {u.status === 1 ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'right',
        cell: (u) => (
          <div className="flex items-center justify-end gap-1">
            {canUpdate && !roleCodes(u).some((role) => role.toUpperCase() === 'OWNER') ? <button
              type="button"
              onClick={() => handleOpenEdit(u)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-vpos-line bg-white text-vpos-text transition hover:bg-vpos-subtle"
              title="Edit User"
            >
              <Icon name="pencil-line" className="text-[14px]" />
            </button> : null}
            {canDelete && !roleCodes(u).some((role) => role.toUpperCase() === 'OWNER') ? <button
              type="button"
              onClick={() => setDeletingUser(u)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-vpos-line bg-white text-vpos-red transition hover:bg-vpos-red-bg"
              title="Delete User"
            >
              <Icon name="delete-bin-line" className="text-[14px]" />
            </button> : null}
          </div>
        ),
      },
    ],
    [rolesByCode, canUpdate, canDelete],
  )

  return (
    <>
      <Topbar
        title="User Management"
        subtitle="Manage staff accounts, store access permissions, and role authorizations."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={cn(pageContent, 'space-y-6 pb-12')}>
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Management', to: paths.settings },
              { label: 'User Management' },
            ]}
          />
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={() => navigate(paths.roles)}>
              <Icon name="shield-keyhole-line" /> Manage Roles
            </Button>
            {canCreate ? (
              <Button variant="primary" onClick={handleOpenCreate} disabled={!roles.some((role) => role.roleCode.toUpperCase() !== 'OWNER')}>
                <Icon name="add-line" /> Add Staff User
              </Button>
            ) : null}
          </div>
        </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-vpos-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-vpos-muted uppercase tracking-wider">Total Users</span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-vpos-primary/10 text-vpos-primary">
              <Icon name="user-3-line" />
            </div>
          </div>
          <div className="mt-3 text-[24px] font-extrabold text-vpos-dark">{totalUsers}</div>
        </div>

        <div className="rounded-xl border border-vpos-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-vpos-muted uppercase tracking-wider">Active Staff</span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-vpos-green-bg text-vpos-green">
              <Icon name="user-check-line" />
            </div>
          </div>
          <div className="mt-3 text-[24px] font-extrabold text-vpos-dark">{activeUsers}</div>
        </div>

        <div className="rounded-xl border border-vpos-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-vpos-muted uppercase tracking-wider">Managers & Cashiers</span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <Icon name="shield-user-line" />
            </div>
          </div>
          <div className="mt-3 text-[24px] font-extrabold text-vpos-dark">{managersCashiers}</div>
        </div>

        <div className="rounded-xl border border-vpos-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-vpos-muted uppercase tracking-wider">Inactive</span>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-vpos-red-bg text-vpos-red">
              <Icon name="user-unfollow-line" />
            </div>
          </div>
          <div className="mt-3 text-[24px] font-extrabold text-vpos-dark">{inactiveUsers}</div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable<User>
        rowKey={(u) => String(u.id)}
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        searchPlaceholder="Search staff by name, username, email..."
        search={search}
        onSearchChange={setSearch}
        toolbar={
          <div className="flex items-center gap-2">
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleFilterOptions}
              className="w-36"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'All status', label: 'All status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              className="w-32"
            />
          </div>
        }
      />

      {/* User Modal (Create/Edit) */}
      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editingUser}
        roles={roles}
        stores={stores}
        businessId={businessId}
        isLoading={createUserMutation.isPending || updateUserMutation.isPending}
        onSave={handleSaveUser}
      />

      <RolePermissionsModal
        open={Boolean(selectedRole)}
        role={selectedRole}
        details={roleDetailsQuery.data}
        isLoading={roleDetailsQuery.isLoading}
        isError={roleDetailsQuery.isError}
        onClose={() => setSelectedRole(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        title={`Delete User Account`}
        description={`Are you sure you want to delete ${deletingUser?.fullName || deletingUser?.username}? This staff member will lose access to the system immediately.`}
        confirmText="Delete User"
        variant="danger"
        isLoading={deleteUserMutation.isPending}
      />
      </main>
    </>
  )
}
