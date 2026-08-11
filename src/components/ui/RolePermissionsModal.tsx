import { useMemo } from 'react'
import type { UserRole, UserRoleDetails } from '../../features/users/types'
import { Button } from './Button'
import { Icon } from './Icon'
import { Modal } from './Modal'

export interface RolePermissionsModalProps {
  open: boolean
  role: UserRole | null
  details?: UserRoleDetails
  isLoading: boolean
  isError: boolean
  onClose: () => void
}

export function RolePermissionsModal({
  open,
  role,
  details,
  isLoading,
  isError,
  onClose,
}: RolePermissionsModalProps) {
  const modules = useMemo(() => {
    const grouped = new Map<string, UserRoleDetails['permissions']>()
    for (const permission of details?.permissions ?? []) {
      const moduleName = permission.moduleName || 'OTHER'
      const current = grouped.get(moduleName) ?? []
      current.push(permission)
      grouped.set(moduleName, current)
    }
    return Array.from(grouped, ([name, permissions]) => ({ name, permissions }))
  }, [details?.permissions])

  const allowedCount = details?.permissions.filter((permission) => permission.allowed).length ?? 0
  const blockedCount = (details?.permissions.length ?? 0) - allowedCount

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={role ? `${role.roleName} permissions` : 'Role permissions'}
      description={role?.description || 'Review which system actions this role can and cannot perform.'}
      size="lg"
      panelClassName="max-w-3xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading role permissions">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-lg bg-vpos-subtle" />
            ))}
          </div>
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-vpos-subtle" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-vpos-red/20 bg-vpos-red-bg px-6 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-vpos-red shadow-2xs">
            <Icon name="error-warning-line" size="lg" />
          </div>
          <h3 className="mt-3 text-[14px] font-bold text-vpos-dark">Role permissions could not be loaded</h3>
          <p className="mt-1 max-w-md text-[12px] text-vpos-muted">
            Close this window and try again. The role itself has not been changed.
          </p>
        </div>
      ) : details ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-vpos-line bg-vpos-subtle p-3.5">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-vpos-muted">Role code</span>
              <div className="mt-1.5 font-mono text-[13px] font-bold text-vpos-dark">{details.roleCode}</div>
            </div>
            <div className="rounded-lg border border-vpos-green/20 bg-vpos-green-bg p-3.5">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-vpos-green">Allowed</span>
              <div className="mt-1.5 text-[22px] font-extrabold text-vpos-green">{allowedCount}</div>
            </div>
            <div className="rounded-lg border border-vpos-red/20 bg-vpos-red-bg p-3.5">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-vpos-red">Not allowed</span>
              <div className="mt-1.5 text-[22px] font-extrabold text-vpos-red">{blockedCount}</div>
            </div>
          </div>

          {modules.length > 0 ? (
            modules.map((module) => {
              const moduleAllowed = module.permissions.filter((permission) => permission.allowed).length
              return (
                <section key={module.name} className="overflow-hidden rounded-lg border border-vpos-line bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-vpos-line bg-vpos-subtle px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon name="shield-keyhole-line" className="text-vpos-primary" />
                      <h3 className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-vpos-dark">
                        {module.name}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-vpos-muted">
                      {moduleAllowed} of {module.permissions.length} allowed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 divide-y divide-vpos-line md:grid-cols-2 md:divide-y-0">
                    {module.permissions.map((permission, index) => (
                      <div
                        key={permission.id ?? permission.permissionCode}
                        className={`flex min-w-0 items-start gap-3 px-4 py-3 ${
                          index >= 2 ? 'md:border-t md:border-vpos-line' : ''
                        } ${index % 2 === 1 ? 'md:border-l md:border-vpos-line' : ''}`}
                      >
                        <div
                          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                            permission.allowed
                              ? 'bg-vpos-green-bg text-vpos-green'
                              : 'bg-vpos-red-bg text-vpos-red'
                          }`}
                        >
                          <Icon name={permission.allowed ? 'check-line' : 'close-line'} size="sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[12px] font-bold text-vpos-dark">
                              {permission.permissionName || permission.permissionCode}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                                permission.allowed
                                  ? 'bg-vpos-green-bg text-vpos-green'
                                  : 'bg-vpos-red-bg text-vpos-red'
                              }`}
                            >
                              {permission.allowed ? 'Allowed' : 'Not allowed'}
                            </span>
                          </div>
                          <code className="mt-1 block truncate text-[10px] text-vpos-muted">
                            {permission.permissionCode}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })
          ) : (
            <div className="rounded-lg border border-dashed border-vpos-line px-6 py-12 text-center text-[13px] text-vpos-muted">
              No permissions are configured for this role.
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  )
}
