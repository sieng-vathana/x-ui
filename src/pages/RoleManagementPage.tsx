import { useEffect, useMemo, useState } from 'react'
import { Breadcrumb, Button, StoreSwitcher, Topbar } from '../components'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { FormField, TextAreaField } from '../components/ui/FormField'
import { Icon } from '../components/ui/Icon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAdminStore } from '../hooks/useAdminStore'
import {
  useCreateRole,
  useDeleteRole,
  usePermissionCatalog,
  useRoleDetails,
  useRoles,
  useUpdateRole,
} from '../features/roles/useRoles'
import type { PermissionCatalogItem, RoleSummary } from '../features/roles/types'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import { pageContent } from '../lib/ui'

const pageAccess = [
  { code: 'x-bff:read', label: 'Overview', icon: 'dashboard-line' },
  { code: 'x-order:create', label: 'Point of Sale', icon: 'store-2-line' },
  { code: 'x-product:read', label: 'Products', icon: 'shopping-bag-3-line' },
  { code: 'x-inventory:read', label: 'Purchases', icon: 'truck-line' },
  { code: 'x-store:read', label: 'Stores', icon: 'building-2-line' },
  { code: 'x-order:read', label: 'Sales', icon: 'line-chart-line' },
  { code: 'x-customer:read', label: 'Customers', icon: 'user-heart-line' },
  { code: 'x-report:read', label: 'Reports', icon: 'bar-chart-box-line' },
  { code: 'x-business:read', label: 'Settings', icon: 'settings-3-line' },
  { code: 'x-user:read', label: 'Users & roles', icon: 'group-line' },
] as const

function roleInitials(role: RoleSummary) {
  return role.roleName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export function RoleManagementPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const businessId = Number(user?.business.id)
  const canCreate = user?.permissions.includes('x-user:create') ?? false
  const canUpdate = user?.permissions.includes('x-user:update') ?? false
  const canDelete = user?.permissions.includes('x-user:delete') ?? false
  const { data: roles = [], isLoading: rolesLoading } = useRoles()
  const { data: catalog = [] } = usePermissionCatalog()
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()
  const deleteMutation = useDeleteRole()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [roleCode, setRoleCode] = useState('')
  const [description, setDescription] = useState('')
  const [permissionIds, setPermissionIds] = useState<Set<number>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<RoleSummary | null>(null)
  const detailsQuery = useRoleDetails(creating ? null : selectedRoleId)
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null
  const isOwner = selectedRole?.roleCode.toUpperCase() === 'OWNER'
  const isSaving = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (!creating && selectedRoleId === null && roles.length) {
      setSelectedRoleId((roles.find((role) => role.roleCode.toUpperCase() === 'OWNER') ?? roles[0]).id)
    }
  }, [creating, roles, selectedRoleId])

  useEffect(() => {
    const details = detailsQuery.data
    if (!details || creating) return
    setRoleName(details.roleName)
    setRoleCode(details.roleCode)
    setDescription(details.description ?? '')
    setPermissionIds(new Set(details.permissions.filter((item) => item.allowed).map((item) => item.id)))
  }, [creating, detailsQuery.data])

  const permissions = useMemo<PermissionCatalogItem[]>(() => {
    if (creating) return catalog
    return (detailsQuery.data?.permissions ?? []).map((permission) => ({
      id: permission.id,
      permissionCode: permission.permissionCode,
      permissionName: permission.permissionName,
      moduleName: permission.moduleName,
      description: permission.description,
    }))
  }, [catalog, creating, detailsQuery.data?.permissions])

  const groupedPermissions = useMemo(() => {
    const grouped = new Map<string, PermissionCatalogItem[]>()
    permissions.forEach((permission) => {
      const moduleName = permission.moduleName || 'OTHER'
      grouped.set(moduleName, [...(grouped.get(moduleName) ?? []), permission])
    })
    return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right))
  }, [permissions])

  const permissionByCode = useMemo(
    () => new Map(permissions.map((permission) => [permission.permissionCode, permission])),
    [permissions],
  )

  const startCreate = () => {
    setCreating(true)
    setSelectedRoleId(null)
    setRoleName('')
    setRoleCode('')
    setDescription('')
    setPermissionIds(new Set())
  }

  const selectRole = (roleId: number) => {
    setCreating(false)
    setSelectedRoleId(roleId)
  }

  const togglePermission = (permissionId: number) => {
    if ((creating && !canCreate) || (!creating && (isOwner || !canUpdate))) return
    setPermissionIds((current) => {
      const next = new Set(current)
      if (next.has(permissionId)) next.delete(permissionId)
      else next.add(permissionId)
      return next
    })
  }

  const saveRole = async () => {
    if (!roleName.trim() || isOwner) return
    const payload = {
      businessId,
      roleName: roleName.trim(),
      roleCode: roleCode.trim() || undefined,
      description: description.trim() || undefined,
      permissionIds: Array.from(permissionIds),
    }
    try {
      if (creating) {
        const created = await createMutation.mutateAsync(payload)
        setCreating(false)
        setSelectedRoleId(created.id)
        toast('Role created successfully.', 'success')
      } else if (selectedRoleId !== null) {
        await updateMutation.mutateAsync({ id: selectedRoleId, payload })
        toast('Role permissions updated.', 'success')
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Role could not be saved.', 'error')
    }
  }

  const deleteRole = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      setSelectedRoleId(null)
      toast('Role deleted successfully.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Role could not be deleted.', 'error')
    }
  }

  const editable = creating ? canCreate : canUpdate && !isOwner
  const selectedCount = permissionIds.size

  return (
    <>
      <Topbar
        title="Role Management"
        subtitle="Build roles for your team, choose which pages they can enter, then define every action."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={cn(pageContent, 'space-y-5 pb-12')}>
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Management', to: paths.settings },
              { label: 'Role Management' },
            ]}
          />
          {canCreate ? (
            <Button variant="primary" onClick={startCreate}>
              <Icon name="add-line" /> Create role
            </Button>
          ) : null}
        </section>

        <div className="grid min-h-[680px] grid-cols-1 overflow-hidden rounded-xl border border-vpos-line bg-white shadow-2xs lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-vpos-line bg-vpos-subtle/30 lg:border-r lg:border-b-0">
          <div className="border-b border-vpos-line px-4 py-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[.13em] text-vpos-muted">Workspace roles</p>
            <p className="mt-1 text-[12px] text-vpos-muted">{roles.length} configured</p>
          </div>
          <div className="max-h-[620px] space-y-1 overflow-y-auto p-2">
            {rolesLoading ? [1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-vpos-line/60" />) : null}
            {roles.map((role) => {
              const owner = role.roleCode.toUpperCase() === 'OWNER'
              const active = !creating && selectedRoleId === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectRole(role.id)}
                  className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition', active ? 'border-vpos-primary/30 bg-white shadow-xs' : 'border-transparent hover:bg-white')}
                >
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[12px] font-extrabold', owner ? 'bg-vpos-primary text-white' : 'bg-vpos-sand text-vpos-primary')}>{owner ? <Icon name="vip-crown-2-fill" /> : roleInitials(role)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-vpos-dark">{role.roleName}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-vpos-muted">{owner ? 'Full access · Locked' : `${role.permissionCount} actions`}</span>
                  </span>
                  <Icon name="arrow-right-s-line" className={cn('text-vpos-muted', active && 'text-vpos-primary')} />
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 border-b border-vpos-line px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <span className={cn('grid h-11 w-11 place-items-center rounded-xl text-[19px]', isOwner ? 'bg-vpos-primary text-white' : 'bg-vpos-sand text-vpos-primary')}><Icon name={isOwner ? 'vip-crown-2-fill' : creating ? 'add-circle-line' : 'shield-user-line'} /></span>
              <div>
                <h2 className="text-[17px] font-extrabold text-vpos-dark">{creating ? 'New custom role' : roleName || 'Select a role'}</h2>
                <p className="mt-0.5 text-[12px] text-vpos-muted">{isOwner ? 'OWNER always has every current and future permission.' : `${selectedCount} actions selected`}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!creating && selectedRole && !isOwner && canDelete ? <Button variant="secondary" className="text-vpos-red" onClick={() => setDeleteTarget(selectedRole)}><Icon name="delete-bin-line" /> Delete</Button> : null}
              {editable ? <Button variant="primary" disabled={isSaving || !roleName.trim()} onClick={saveRole}><Icon name="save-line" /> {isSaving ? 'Saving…' : creating ? 'Create role' : 'Save changes'}</Button> : null}
            </div>
          </div>

          <div className="space-y-6 p-5">
            <section className="grid grid-cols-1 gap-4 rounded-lg border border-vpos-line bg-vpos-subtle/50 p-4 md:grid-cols-2">
              <FormField label="Role name" required value={roleName} disabled={!editable} onChange={(event) => setRoleName(event.target.value)} placeholder="e.g. Senior cashier" />
              <FormField label="Role code" value={roleCode} disabled={!creating || !editable} onChange={(event) => setRoleCode(event.target.value.toUpperCase())} placeholder="Generated from name" />
              <TextAreaField className="md:col-span-2" label="Description" showToolbar={false} value={description} disabled={!editable} onChange={(event) => setDescription(event.target.value)} placeholder="Explain who should receive this role." />
            </section>

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div><h3 className="text-[14px] font-extrabold text-vpos-dark">Page access</h3><p className="mt-0.5 text-[11px] text-vpos-muted">Quick controls for the main workspace pages.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                {pageAccess.map((page) => {
                  const permission = permissionByCode.get(page.code)
                  const allowed = Boolean(permission && permissionIds.has(permission.id))
                  return (
                    <button key={page.code} type="button" disabled={!editable || !permission} onClick={() => permission && togglePermission(permission.id)} className={cn('flex min-h-20 flex-col items-start justify-between rounded-lg border p-3 text-left transition', allowed ? 'border-vpos-primary/30 bg-vpos-sand text-vpos-primary' : 'border-vpos-line bg-white text-vpos-muted', editable && permission && 'hover:border-vpos-primary/50', (!editable || !permission) && 'cursor-default')}>
                      <span className="flex w-full items-center justify-between"><Icon name={page.icon} className="text-[17px]" /><Icon name={allowed ? 'checkbox-circle-fill' : 'checkbox-blank-circle-line'} /></span>
                      <span className="text-[11px] font-bold">{page.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <div className="mb-3"><h3 className="text-[14px] font-extrabold text-vpos-dark">Action permissions</h3><p className="mt-0.5 text-[11px] text-vpos-muted">Fine-grained controls used by API actions and page buttons.</p></div>
              <div className="space-y-3">
                {groupedPermissions.map(([moduleName, modulePermissions]) => (
                  <div key={moduleName} className="overflow-hidden rounded-lg border border-vpos-line">
                    <div className="flex items-center justify-between border-b border-vpos-line bg-vpos-subtle px-4 py-2.5"><span className="text-[11px] font-extrabold uppercase tracking-[.12em] text-vpos-dark">{moduleName}</span><span className="text-[10px] font-semibold text-vpos-muted">{modulePermissions.filter((permission) => permissionIds.has(permission.id)).length}/{modulePermissions.length}</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                      {modulePermissions.map((permission) => {
                        const allowed = permissionIds.has(permission.id)
                        return (
                          <button key={permission.id} type="button" disabled={!editable} onClick={() => togglePermission(permission.id)} className="flex items-start gap-3 border-b border-vpos-line px-4 py-3 text-left last:border-b-0 hover:bg-vpos-subtle/60 md:border-r">
                            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border text-[13px]', allowed ? 'border-vpos-primary bg-vpos-primary text-white' : 'border-vpos-line bg-white text-transparent')}><Icon name="check-line" /></span>
                            <span className="min-w-0"><span className="block text-[12px] font-bold text-vpos-dark">{permission.permissionName || permission.permissionCode}</span><code className="mt-0.5 block truncate text-[9px] text-vpos-muted">{permission.permissionCode}</code></span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>

      <ConfirmModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={deleteRole} title="Delete custom role" description={`Delete ${deleteTarget?.roleName ?? 'this role'}? Roles assigned to staff must be reassigned before deletion.`} confirmText="Delete role" variant="danger" isLoading={deleteMutation.isPending} />
    </>
  )
}
