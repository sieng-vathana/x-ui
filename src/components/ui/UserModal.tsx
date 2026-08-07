import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { FormField } from './FormField'
import { Select } from './Select'
import type { User, UserRole, CreateUserPayload, UpdateUserPayload } from '../../features/users/types'

export interface UserModalProps {
  open: boolean
  onClose: () => void
  user?: User | null
  roles?: UserRole[]
  isLoading?: boolean
  onSave: (payload: any) => Promise<void>
}

export function UserModal({
  open,
  onClose,
  user,
  roles = [],
  isLoading = false,
  onSave,
}: UserModalProps) {
  const isEdit = Boolean(user)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [roleCode, setRoleCode] = useState('MANAGER')
  const [status, setStatus] = useState(1) // 1 = Active, 0 = Inactive

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setUsername(user.username || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setPassword('')
      setRoleCode(user.role || user.roles?.[0] || 'MANAGER')
      setStatus(user.status ?? 1)
    } else {
      setFullName('')
      setUsername('')
      setEmail('')
      setPhone('')
      setPassword('')
      setRoleCode('MANAGER')
      setStatus(1)
    }
  }, [user, open])

  const roleOptions = roles.length > 0
    ? roles.map((r) => ({ value: r.roleCode, label: `${r.roleName} (${r.roleCode})` }))
    : [
        { value: 'OWNER', label: 'Owner (Full Access)' },
        { value: 'MANAGER', label: 'Store Manager' },
        { value: 'CASHIER', label: 'Cashier' },
        { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
      ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit) {
      const payload: UpdateUserPayload = {
        fullName,
        email,
        phone,
        status,
        role: roleCode,
        ...(password ? { password } : {}),
      }
      await onSave(payload)
    } else {
      const payload: CreateUserPayload = {
        fullName,
        username,
        password: password || 'ChangeMe123!',
        email,
        phone,
        status,
        role: roleCode,
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
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={roleCode}
            onChange={setRoleCode}
            options={roleOptions}
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

        <div>
          <label className="mb-1.5 block text-[12px] font-extrabold tracking-[.02em] text-vpos-primary-2">
            Account status
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatus(1)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-bold transition ${
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
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-bold transition ${
                status === 0
                  ? 'border-vpos-red bg-vpos-red-bg text-vpos-red shadow-xs'
                  : 'border-vpos-line bg-white text-vpos-muted hover:bg-vpos-subtle'
              }`}
            >
              <span>○ Inactive</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
