import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { FormField, TextAreaField } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import type { StoreOption } from '../pos/StoreSwitcher'
import type { Customer, CustomerAddress, CustomerPayload } from '../../features/customers/types'

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

function createAddressDraft(receiverName = '', phone = ''): CustomerAddress {
  return {
    receiverName,
    phone,
    isDefault: false,
  }
}

function formatAddress(address: CustomerAddress) {
  return [
    address.streetAddress,
    address.village,
    address.commune,
    address.district,
    address.provinceCity,
  ]
    .filter(Boolean)
    .join(', ')
}

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
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressDraft, setAddressDraft] = useState<CustomerAddress>(createAddressDraft())
  const [addressEditorOpen, setAddressEditorOpen] = useState(false)
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null)
  const [addressError, setAddressError] = useState('')

  useEffect(() => {
    setFullName(customer?.fullName ?? '')
    setCustomerCode(customer?.customerCode ?? '')
    setPhone(customer?.phone ?? '')
    setEmail(customer?.email ?? '')
    setGender(customer?.gender ?? '')
    setDateOfBirth(customer?.dateOfBirth ?? '')
    setStoreId(customer?.storeId ? String(customer.storeId) : '')
    setNote(customer?.note ?? '')
    setAddresses(customer?.addresses?.map((address) => ({ ...address })) ?? [])
    setAddressDraft(createAddressDraft(customer?.fullName ?? '', customer?.phone ?? ''))
    setAddressEditorOpen(false)
    setEditingAddressIndex(null)
    setAddressError('')
  }, [customer, open])

  const openNewAddressEditor = () => {
    setEditingAddressIndex(null)
    setAddressDraft(createAddressDraft(fullName.trim(), phone.trim()))
    setAddressError('')
    setAddressEditorOpen(true)
  }

  const openAddressEditor = (index: number) => {
    setEditingAddressIndex(index)
    setAddressDraft({ ...addresses[index] })
    setAddressError('')
    setAddressEditorOpen(true)
  }

  const closeAddressEditor = () => {
    setAddressEditorOpen(false)
    setEditingAddressIndex(null)
    setAddressError('')
  }

  const updateAddressDraft = (field: keyof CustomerAddress, value: string) => {
    setAddressDraft((current) => ({ ...current, [field]: value }))
  }

  const saveAddress = () => {
    const normalized: CustomerAddress = {
      ...addressDraft,
      addressName: addressDraft.addressName?.trim() || undefined,
      receiverName: addressDraft.receiverName?.trim() || undefined,
      phone: addressDraft.phone?.trim() || undefined,
      provinceCity: addressDraft.provinceCity?.trim() || undefined,
      district: addressDraft.district?.trim() || undefined,
      commune: addressDraft.commune?.trim() || undefined,
      village: addressDraft.village?.trim() || undefined,
      streetAddress: addressDraft.streetAddress?.trim() || undefined,
      landmark: addressDraft.landmark?.trim() || undefined,
      deliveryInstructions: addressDraft.deliveryInstructions?.trim() || undefined,
    }

    if (!normalized.receiverName || !normalized.phone || !normalized.provinceCity || !normalized.streetAddress) {
      setAddressError('Add the receiver, phone number, province/city, and street address to save this address.')
      return
    }

    setAddresses((current) => {
      const next = [...current]
      if (editingAddressIndex === null) next.push(normalized)
      else next[editingAddressIndex] = normalized

      const selectedDefault = next.findIndex((address) => address.isDefault)
      const defaultIndex = normalized.isDefault
        ? editingAddressIndex ?? next.length - 1
        : selectedDefault >= 0
          ? selectedDefault
          : 0

      return next.map((address, index) => ({
        ...address,
        isDefault: index === defaultIndex,
      }))
    })
    closeAddressEditor()
  }

  const removeAddress = (index: number) => {
    setAddresses((current) => {
      const next = current.filter((_, addressIndex) => addressIndex !== index)
      if (next.length > 0 && !next.some((address) => address.isDefault)) {
        next[0] = { ...next[0], isDefault: true }
      }
      return next
    })
    if (editingAddressIndex === index) closeAddressEditor()
  }

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
      addresses: addresses.length > 0 ? addresses : undefined,
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
        <section className="rounded-[6px] border border-vpos-line bg-vpos-subtle/35 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-vpos-primary">Delivery</p>
              <h3 className="mt-1 text-[15px] font-bold text-vpos-dark">Shipping addresses</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-vpos-muted">Optional. Save a delivery location for future orders.</p>
            </div>
            <Button type="button" variant="soft" onClick={openNewAddressEditor}>
              <i className="ri-add-line" aria-hidden="true" />
              {addresses.length > 0 ? 'Add another' : 'Add address'}
            </Button>
          </div>

          {addresses.length > 0 ? (
            <div className="mt-4 space-y-2">
              {addresses.map((address, index) => (
                <div key={address.id ?? `new-address-${index}`} className="flex items-start gap-3 rounded-[5px] border border-vpos-line bg-white p-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-vpos-sand text-vpos-primary">
                    <i className="ri-map-pin-2-line" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-bold text-vpos-dark">{address.addressName || `Address ${index + 1}`}</p>
                      {address.isDefault ? <span className="rounded-full bg-vpos-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-vpos-primary">Default shipping</span> : null}
                    </div>
                    <p className="mt-1 text-[12px] font-semibold text-vpos-text">{address.receiverName} · {address.phone}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-vpos-muted">{formatAddress(address)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label={`Edit ${address.addressName || `address ${index + 1}`}`} onClick={() => openAddressEditor(index)} className="grid h-8 w-8 place-items-center rounded-[4px] text-vpos-muted hover:bg-vpos-subtle hover:text-vpos-primary">
                      <i className="ri-pencil-line" aria-hidden="true" />
                    </button>
                    <button type="button" aria-label={`Remove ${address.addressName || `address ${index + 1}`}`} onClick={() => removeAddress(index)} className="grid h-8 w-8 place-items-center rounded-[4px] text-vpos-muted hover:bg-red-50 hover:text-vpos-red">
                      <i className="ri-delete-bin-line" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-[5px] border border-dashed border-vpos-line bg-white px-3 py-3 text-[12px] text-vpos-muted">
              <i className="ri-truck-line text-[18px] text-vpos-primary" aria-hidden="true" />
              No shipping address added yet.
            </div>
          )}

          {addressEditorOpen ? (
            <div className="mt-4 rounded-[5px] border border-vpos-primary/25 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42_/_0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-[13px] font-bold text-vpos-dark">{editingAddressIndex === null ? 'New shipping address' : 'Edit shipping address'}</h4>
                  <p className="mt-0.5 text-[12px] text-vpos-muted">Use the details your delivery team needs at the door.</p>
                </div>
                {editingAddressIndex === null && addresses.length === 0 ? <span className="rounded-full bg-vpos-subtle px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-vpos-muted">Optional</span> : null}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Address label" value={addressDraft.addressName ?? ''} onChange={(event) => updateAddressDraft('addressName', event.target.value)} placeholder="Home, shop, office..." />
                <FormField label="Receiver name" required value={addressDraft.receiverName ?? ''} onChange={(event) => updateAddressDraft('receiverName', event.target.value)} placeholder="Who receives the order?" />
                <FormField label="Receiver phone" type="tel" required value={addressDraft.phone ?? ''} onChange={(event) => updateAddressDraft('phone', event.target.value)} placeholder="+855 12 345 678" />
                <FormField label="Province / city" required value={addressDraft.provinceCity ?? ''} onChange={(event) => updateAddressDraft('provinceCity', event.target.value)} placeholder="Phnom Penh" />
                <FormField label="District / khan" value={addressDraft.district ?? ''} onChange={(event) => updateAddressDraft('district', event.target.value)} placeholder="Chamkarmon" />
                <FormField label="Commune / sangkat" value={addressDraft.commune ?? ''} onChange={(event) => updateAddressDraft('commune', event.target.value)} placeholder="Tonle Bassac" />
                <FormField label="Village" value={addressDraft.village ?? ''} onChange={(event) => updateAddressDraft('village', event.target.value)} placeholder="Optional" />
                <FormField label="Street address" required value={addressDraft.streetAddress ?? ''} onChange={(event) => updateAddressDraft('streetAddress', event.target.value)} placeholder="House number, street, building, unit" />
                <FormField className="sm:col-span-2" label="Landmark" value={addressDraft.landmark ?? ''} onChange={(event) => updateAddressDraft('landmark', event.target.value)} placeholder="Near Central Market, opposite the bank..." />
                <TextAreaField className="sm:col-span-2" label="Delivery instructions" showToolbar={false} value={addressDraft.deliveryInstructions ?? ''} onChange={(event) => updateAddressDraft('deliveryInstructions', event.target.value)} placeholder="Gate code, preferred delivery time, or other helpful details" />
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-vpos-text">
                <input type="checkbox" checked={Boolean(addressDraft.isDefault)} onChange={(event) => setAddressDraft((current) => ({ ...current, isDefault: event.target.checked }))} className="h-4 w-4 accent-vpos-primary" />
                Use as the default shipping address
              </label>

              {addressError ? <p role="alert" className="mt-3 text-[12px] font-semibold text-vpos-red">{addressError}</p> : null}
              <div className="mt-4 flex justify-end gap-2 border-t border-vpos-line pt-4">
                <Button type="button" variant="secondary" onClick={closeAddressEditor}>Cancel</Button>
                <Button type="button" variant="primary" onClick={saveAddress}>Save address</Button>
              </div>
            </div>
          ) : null}
        </section>
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
