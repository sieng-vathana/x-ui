import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import type { CustomerPayload } from '../../features/customers/types'

interface QuickCustomerModalProps {
  open: boolean
  onClose: () => void
  businessId: number
  storeId: number
  isLoading?: boolean
  onSave: (payload: CustomerPayload) => Promise<void>
}

export function QuickCustomerModal({
  open,
  onClose,
  businessId,
  storeId,
  isLoading = false,
  onSave,
}: QuickCustomerModalProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!open) return
    setFullName('')
    setPhone('')
    setEmail('')
  }, [open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = fullName.trim()
    if (!trimmedName) return

    await onSave({
      businessId,
      storeId,
      fullName: trimmedName,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick add customer"
      description="Create a customer and continue this sale without leaving the POS."
      size="sm"
      closeOnBackdrop={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Full name"
          required
          autoFocus
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="e.g. Sokha Retail"
        />
        <FormField
          label="Phone number"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+855 12 345 678"
        />
        <FormField
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="customer@example.com"
        />
        <div className="flex justify-end gap-2 border-t border-vpos-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !fullName.trim()}>
            {isLoading ? 'Adding…' : 'Add customer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
