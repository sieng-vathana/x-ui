import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { FormField, TextAreaField } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import type { StoreOption } from '../pos/StoreSwitcher'
import type { Customer, CustomerPayload } from '../../features/customers/types'

interface CustomerModalProps {
  open: boolean
  onClose: () => void
  customer?: Customer | null
  stores: StoreOption[]
  businessId: number
  isLoading?: boolean
  onSave: (payload: CustomerPayload) => Promise<void>
}

const genderOptions = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
]

export function CustomerModal({
  open,
  onClose,
  customer,
  stores,
  businessId,
  isLoading = false,
  onSave,
}: CustomerModalProps) {
  const isEdit = Boolean(customer)
  const [fullName, setFullName] = useState('')
  const [customerCode, setCustomerCode] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [storeId, setStoreId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    setFullName(customer?.fullName ?? '')
    setCustomerCode(customer?.customerCode ?? '')
    setPhone(customer?.phone ?? '')
    setEmail(customer?.email ?? '')
    setGender(customer?.gender ?? '')
    setDateOfBirth(customer?.dateOfBirth ?? '')
    setStoreId(customer?.storeId ? String(customer.storeId) : '')
    setNote(customer?.note ?? '')
  }, [customer, open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await onSave({
      businessId,
      storeId: storeId ? Number(storeId) : null,
      customerCode: customerCode.trim() || undefined,
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
      note: note.trim() || undefined,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit customer: ${customer?.fullName}` : 'Add customer'}
      description="Keep customer details available for sales, receipts, and follow-up."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full name" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Sokha Retail" />
          <FormField label="Customer code" value={customerCode} onChange={(event) => setCustomerCode(event.target.value.toUpperCase())} placeholder="Auto-generated if blank" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+855 12 345 678" />
          <FormField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="customer@example.com" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Gender" value={gender} onChange={setGender} options={genderOptions} placeholder="Not specified" />
          <FormField label="Date of birth" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
          <Select
            label="Default store"
            value={storeId}
            onChange={setStoreId}
            options={stores.map((store) => ({ value: store.id, label: store.name }))}
            placeholder="All stores"
            searchable
          />
        </div>
        <TextAreaField label="Note" showToolbar={false} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional customer note" />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isLoading || !fullName.trim()}>
            {isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
