import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { FormField } from './FormField'
import { Select } from './Select'
import type { User, UserRole, CreateUserPayload, UpdateUserPayload } from '../../features/users/types'
import type { StoreOption } from '../pos/StoreSwitcher'

export interface UserModalProps {
  open: boolean
  onClose: () => void
  user?: User | null
  roles?: UserRole[]
  stores?: StoreOption[]
  businessId: number
  isLoading?: boolean
  onSave: (payload: CreateUserPayload | UpdateUserPayload) => Promise<void>
}

export function UserModal({
  open,
  onClose,
  user,
  roles = [],
  stores = [],
  businessId,
  isLoading = false,
  onSave,
}: UserModalProps) {
  const isEdit = Boolean(user)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [storeIds, setStoreIds] = useState<number[]>([])
  const [status, setStatus] = useState(1) // 1 = Active, 0 = Inactive

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setUsername(user.username || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setPassword('')
      setRoleId(String(user.memberships?.[0]?.roleId ?? ''))
      setStoreIds(user.memberships?.map((membership) => membership.storeId) ?? [])
      setStatus(user.status ?? 1)
    } else {
      setFullName('')
      setUsername('')
      setEmail('')
      setPhone('')
      setPassword('')
      setRoleId('')
      setStoreIds(stores.length === 1 ? [Number(stores[0].id)] : [])
      setStatus(1)
    }
  }, [user, open, stores])

  const roleOptions = roles
    .filter((role) => role.roleCode.toUpperCase() !== 'OWNER')
    .map((role) => ({ value: String(role.id), label: `${role.roleName} (${role.roleCode})` }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedRoleId = Number(roleId)
    if (!selectedRoleId || storeIds.length === 0) return
    if (isEdit) {
      const payload: UpdateUserPayload = {
        businessId,
        roleId: selectedRoleId,
        storeIds,
        fullName,
        email,
        phone,
        status,
        ...(password ? { password } : {}),
      }
      await onSave(payload)
    } else {
      const payload: CreateUserPayload = {
        businessId,
        roleId: selectedRoleId,
        storeIds,
        fullName,
        username,
        password,
        email,
        phone,
        status,
      }
      await onSave(payload)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Staff User: ${user?.fullName || user?.username}` : 'Add New Staff User'}
      description={isEdit ? 'Update staff member profile, role, and status permissions.' : 'Create a new staff user account with assigned role and store access.'}
      size="lg"
      closeOnBackdrop={false}
      panelClassName="max-h-[min(92vh,820px)]"
      bodyClassName="max-h-[min(80vh,680px)] py-6 sm:px-7"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Alex Morgan"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Username"
            required={!isEdit}
            disabled={isEdit}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. alex.m"
          />

          <Select
            label="Role"
            value={roleId}
            onChange={setRoleId}
            options={roleOptions}
            placeholder={roleOptions.length ? 'Select a role' : 'Create a custom role first'}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@company.com"
          />

          <FormField
            label="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+855 12 345 678"
          />
        </div>

        <FormField
          label={isEdit ? 'New password (leave blank to keep current)' : 'Password'}
          required={!isEdit}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isEdit ? '••••••••' : 'Min 8 characters'}
        />

        <fieldset className="border-t border-vpos-line pt-5">
          <legend className="mb-2 block text-[13px] font-extrabold uppercase tracking-[.12em] text-vpos-primary">
            Store access <b className="text-vpos-red">*</b>
          </legend>
          <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-vpos-line bg-vpos-subtle p-2 sm:grid-cols-2">
            {stores.length ? stores.map((store) => {
              const storeId = Number(store.id)
              const checked = storeIds.includes(storeId)
              return (
                <label key={store.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-vpos-line bg-white px-3.5 py-3 text-[13px] font-semibold text-vpos-text transition hover:border-vpos-primary/50 hover:bg-vpos-sand/30">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setStoreIds((current) => checked
                      ? current.filter((id) => id !== storeId)
                      : [...current, storeId])}
                    className="h-4 w-4 accent-vpos-primary"
                  />
                  <span className="min-w-0 truncate">{store.name}</span>
                </label>
              )
            }) : (
              <p className="col-span-full px-2 py-4 text-center text-[12px] text-vpos-muted">No stores are available.</p>
            )}
          </div>
        </fieldset>

        <div className="border-t border-vpos-line pt-5">
          <label className="mb-2 block text-[13px] font-extrabold uppercase tracking-[.12em] text-vpos-primary">
            Account status
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatus(1)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition ${
                status === 1
                  ? 'border-vpos-green bg-vpos-green-bg text-vpos-green shadow-xs'
                  : 'border-vpos-line bg-white text-vpos-muted hover:bg-vpos-subtle'
              }`}
            >
              <span>● Active</span>
            </button>
            <button
              type="button"
              onClick={() => setStatus(0)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition ${
                status === 0
                  ? 'border-vpos-red bg-vpos-red-bg text-vpos-red shadow-xs'
                  : 'border-vpos-line bg-white text-vpos-muted hover:bg-vpos-subtle'
              }`}
            >
              <span>○ Inactive</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-vpos-line pt-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !roleId || storeIds.length === 0 || (!isEdit && password.length < 8)}
          >
            {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
