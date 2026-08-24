import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  Modal,
  Status,
  StoreSwitcher,
  Topbar,
  FormField,
  SelectField,
  type DataTableColumn,
} from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import {
  productOptionTypes as initialOptions,
} from '../../data/mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'
import { useToast } from '../../context/ToastContext'
import { useStoresRaw } from '../../features/stores/useStores'
import {
  useProductOptionsList,
  useProductOption,
  useCreateProductOption,
  useUpdateProductOption,
  useAddOptionValue,
  useDeleteOptionValue,
  useDeleteProductOption,
} from '../../features/products/useProducts'

export interface OptionValueItem {
  id?: number | string
  value: string
}

export interface ProductOptionType {
  id: string | number
  name: string
  values: OptionValueItem[]
  usedOnProducts: number
  status: 'Active' | 'Inactive'
  description?: string
  isGlobal?: boolean
  storeIds?: number[]
}

const fallbackMockOptions: ProductOptionType[] = initialOptions.map((o) => ({
  ...o,
  values: o.values.map((v) => (typeof v === 'string' ? { value: v } : v)),
}))

interface OptionFormData {
  name: string
  values: OptionValueItem[]
  description: string
  isGlobal: boolean
  storeIds: number[]
  status: 'Active' | 'Inactive'
}

interface FormErrors {
  name?: string
  values?: string
  storeIds?: string
}

function validateForm(data: OptionFormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim()) {
    errors.name = 'Name is required.'
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }
  if (!data.values || data.values.length === 0) {
    errors.values = 'At least one value is required.'
  }
  if (!data.isGlobal && data.storeIds.length === 0) {
    errors.storeIds = 'Please select at least one store for store-specific coverage.'
  }
  return errors
}

function OptionActionsMenu({
  option,
  onEdit,
  onView,
  onDelete,
}: {
  option: ProductOptionType
  onEdit: () => void
  onView: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(16, rect.right - 176),
      })
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleScrollOrResize = () => setOpen(false)

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-[19px] text-vpos-muted transition-all duration-150 hover:bg-vpos-subtle hover:text-vpos-text active:scale-95 cursor-pointer"
        onClick={handleToggle}
        aria-label={`Actions for ${option.name}`}
      >
        <Icon name="more-2-fill" />
      </button>

      {open && coords && createPortal(
        <div
          ref={menuRef}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed z-[99999] w-44 rounded-xl border border-vpos-line/80 bg-white/95 backdrop-blur-md p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-150 ease-out animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-text transition-all duration-150 hover:bg-vpos-subtle active:scale-[0.98] cursor-pointer border-0 bg-transparent"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            <Icon name="edit-line" className="text-[16px] text-vpos-muted" />
            Edit option type
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-text transition-all duration-150 hover:bg-vpos-subtle active:scale-[0.98] cursor-pointer border-0 bg-transparent"
            onClick={() => {
              setOpen(false)
              onView()
            }}
          >
            <Icon name="eye-line" className="text-[16px] text-vpos-muted" />
            View details
          </button>
          {option.status !== 'Inactive' && (
            <>
              <div className="my-1 h-px bg-vpos-line/60" />
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-vpos-red transition-all duration-150 hover:bg-vpos-red-bg active:scale-[0.98] cursor-pointer border-0 bg-transparent"
                onClick={() => {
                  setOpen(false)
                  onDelete()
                }}
              >
                <Icon name="delete-bin-line" className="text-[16px] text-vpos-red" />
                Delete option type
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

function OptionDetailsModal({
  option,
  open,
  onClose,
  onEdit,
  stores,
}: {
  option: ProductOptionType | null
  open: boolean
  onClose: () => void
  onEdit: (option: ProductOptionType) => void
  stores: any[]
}) {
  // Postman Request #3: Get Single Option by ID (GET /api/v1/products/attributes/{{optionId}})
  const { data: fetchedOption, isLoading: isFetchingSingle } = useProductOption(
    open && option?.id ? option.id : undefined
  )
  const addOptionValueMutation = useAddOptionValue()
  const deleteOptionValueMutation = useDeleteOptionValue()
  const { toast } = useToast()

  const [newValueInput, setNewValueInput] = useState('')
  const [isAddingValue, setIsAddingValue] = useState(false)

  if (!option) return null

  const currentOption: ProductOptionType = fetchedOption
    ? {
        id: fetchedOption.id,
        name: fetchedOption.attributeName || option.name,
        values: Array.isArray(fetchedOption.values)
          ? fetchedOption.values.map((v: any) =>
              typeof v === 'string' ? { value: v } : { id: v.id, value: v.value || '' }
            )
          : option.values,
        usedOnProducts: fetchedOption.usedOnProducts ?? option.usedOnProducts,
        status:
          fetchedOption.status === 1 || fetchedOption.status === 'Active' || fetchedOption.status === 'ACTIVE'
            ? 'Active'
            : 'Inactive',
        description: fetchedOption.description || option.description,
        isGlobal: fetchedOption.isGlobal ?? option.isGlobal,
        storeIds: fetchedOption.storeIds || option.storeIds,
      }
    : option

  const storeMap = new Map<number, string>()
  stores.forEach((s) => storeMap.set(Number(s.id), s.name))

  const isGlobal = currentOption.isGlobal ?? true

  // Postman Request #5: Add Single Value to Option (POST /api/v1/products/attributes/{{optionId}}/values)
  const handleAddSingleValue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newValueInput.trim()) return
    const val = newValueInput.trim()
    setIsAddingValue(true)
    try {
      await addOptionValueMutation.mutateAsync({ optionId: currentOption.id, value: val })
      toast(`Added value "${val}" to ${currentOption.name}.`, 'success')
      setNewValueInput('')
    } catch (err: any) {
      toast(err?.message || 'Failed to add option value via API.', 'error')
    } finally {
      setIsAddingValue(false)
    }
  }

  // Postman Request #6: Delete Option Value (DELETE /api/v1/products/attributes/values/{{valueId}})
  const handleDeleteSingleValue = async (valObj: OptionValueItem) => {
    if (!valObj.id) {
      toast('Value ID required to delete via API.', 'error')
      return
    }
    try {
      await deleteOptionValueMutation.mutateAsync({ valueId: valObj.id, optionId: currentOption.id })
      toast(`Option value "${valObj.value}" was deleted.`, 'success')
    } catch (err: any) {
      toast(err?.message || 'Failed to delete option value via API.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Option type details"
      description="View full product option type information and assigned values."
      size="2xl"
      panelClassName="max-w-3xl sm:max-w-3xl w-full"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={() => {
              onClose()
              onEdit(currentOption)
            }}
          >
            <Icon name="edit-line" /> Edit option type
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Header preview banner */}
        <div className="flex items-center gap-4 rounded-xl border border-vpos-line bg-[#fbfcfd] p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-vpos-sand text-[26px] text-vpos-primary shadow-xs">
            <Icon name="list-settings-line" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="m-0 truncate text-[17px] font-bold text-vpos-text">{currentOption.name}</h3>
              <Status value={currentOption.status} />
              {isFetchingSingle && (
                <span className="text-[11px] font-semibold text-vpos-muted animate-pulse">Syncing…</span>
              )}
            </div>
            <span className="mt-1 block font-mono text-[12px] font-bold tracking-[0.06em] text-vpos-muted">
              ID: {currentOption.id}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
          <div className="rounded-lg border border-vpos-line/70 bg-white p-3">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-vpos-muted">Values Count</span>
            <div className="mt-1 font-mono font-bold text-vpos-text">{currentOption.values?.length ?? 0} values</div>
          </div>

          <div className="rounded-lg border border-vpos-line/70 bg-white p-3">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-vpos-muted">Used On Products</span>
            <div className="mt-1 font-mono font-bold text-vpos-text">{currentOption.usedOnProducts ?? 0} products</div>
          </div>

          <div className="col-span-2 rounded-lg border border-vpos-line/70 bg-white p-3 sm:col-span-1">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-vpos-muted">Coverage</span>
            <div className="mt-1 font-semibold text-vpos-text">
              {isGlobal ? (
                <span className="inline-flex items-center gap-1 text-vpos-primary">
                  <Icon name="global-line" /> All stores (Global)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-vpos-text">
                  <Icon name="store-2-line" /> Store-specific ({currentOption.storeIds?.length ?? 0} assigned)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Values List Section */}
        <div className="rounded-xl border border-vpos-line bg-white p-4">
          <span className="mb-2.5 block text-[12px] font-bold uppercase tracking-[0.08em] text-vpos-muted">
            Option Values ({currentOption.values?.length ?? 0})
          </span>
          <div className="flex flex-wrap gap-2 mb-3">
            {currentOption.values && currentOption.values.length > 0 ? (
              currentOption.values.map((v, idx) => (
                <span
                  key={v.id ?? `${v.value}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-vpos-line bg-vpos-subtle px-3 py-1.5 text-[13px] font-bold text-vpos-text shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-vpos-primary" />
                  {v.value}
                  {v.id ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteSingleValue(v)}
                      className="ml-1 opacity-50 hover:opacity-100 text-vpos-red transition-opacity cursor-pointer border-0 bg-transparent p-0"
                      title={`Delete value "${v.value}" (ID: ${v.id})`}
                    >
                      <Icon name="close-line" className="text-[13px]" />
                    </button>
                  ) : null}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-vpos-muted italic">No values defined.</span>
            )}
          </div>

          {/* Single Value Addition Form (Endpoint 5) */}
          <form onSubmit={handleAddSingleValue} className="flex items-center gap-2 border-t border-vpos-line/60 pt-3">
            <input
              type="text"
              value={newValueInput}
              onChange={(e) => setNewValueInput(e.target.value)}
              placeholder="Add single value (e.g. green)..."
              className="flex-1 rounded-lg border border-vpos-line bg-vpos-subtle/40 px-3 py-1.5 text-[13px] text-vpos-text outline-none focus:border-vpos-primary"
            />
            <Button variant="secondary" type="submit" disabled={isAddingValue || !newValueInput.trim()}>
              {isAddingValue ? 'Adding...' : '+ Add single value'}
            </Button>
          </form>
        </div>

        {/* Assigned stores list if store-specific */}
        {!isGlobal && (
          <div className="rounded-xl border border-vpos-line bg-white p-4">
            <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.08em] text-vpos-muted">
              Assigned Stores ({currentOption.storeIds?.length ?? 0})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentOption.storeIds && currentOption.storeIds.length > 0 ? (
                currentOption.storeIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-lg border border-vpos-line bg-vpos-subtle px-2.5 py-1 text-[12px] font-medium text-vpos-text"
                  >
                    <Icon name="store-2-line" className="text-vpos-muted text-[13px]" />
                    {storeMap.get(Number(id)) || `Store #${id}`}
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-vpos-muted">No stores assigned</span>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="rounded-xl border border-vpos-line bg-white p-4">
          <span className="mb-1 block text-[12px] font-bold uppercase tracking-[0.08em] text-vpos-muted">Description</span>
          <p className="m-0 text-[13px] leading-relaxed text-vpos-text">
            {currentOption.description?.trim() || <span className="text-vpos-muted italic">No description provided.</span>}
          </p>
        </div>
      </div>
    </Modal>
  )
}

interface OptionFormModalProps {
  open: boolean
  option: ProductOptionType | null
  onClose: () => void
  onSave: (data: {
    payload: {
      name: string
      values: OptionValueItem[]
      usedOnProducts: number
      status: 'Active' | 'Inactive'
      description?: string
      isGlobal: boolean
      storeIds?: number[]
    }
    isEdit: boolean
    id?: string | number
  }) => Promise<void>
  isSaving: boolean
}

function ValuesTagInput({
  values,
  onChange,
  error,
}: {
  values: OptionValueItem[]
  onChange: (newValues: OptionValueItem[]) => void
  error?: string
}) {
  const [inputValue, setInputValue] = useState('')

  const handleAddValue = (textToAdd?: string) => {
    const raw = textToAdd ?? inputValue
    if (!raw.trim()) return
    const parts = raw
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)

    if (parts.length > 0) {
      const updated = [...values]
      parts.forEach((p) => {
        if (!updated.some((item) => item.value.toLowerCase() === p.toLowerCase())) {
          updated.push({ value: p })
        }
      })
      onChange(updated)
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddValue()
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      e.preventDefault()
      onChange(values.slice(0, -1))
    }
  }

  const handleRemove = (indexToRemove: number) => {
    onChange(values.filter((_, idx) => idx !== indexToRemove))
  }

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-extrabold uppercase tracking-[.12em] text-vpos-primary">
        Option Values <span className="text-vpos-red">*</span>
      </label>

      <div
        className={cn(
          'flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white p-2 transition-all focus-within:border-vpos-primary focus-within:ring-2 focus-within:ring-vpos-sand',
          error ? 'border-vpos-red' : 'border-vpos-line',
        )}
      >
        {values.map((valObj, idx) => (
          <span
            key={`${valObj.id || valObj.value}-${idx}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-vpos-line bg-vpos-sand/50 px-2.5 py-1 text-[13px] font-bold text-vpos-primary shadow-2xs"
          >
            <span>{valObj.value}</span>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="grid h-4 w-4 place-items-center rounded-full text-vpos-muted hover:bg-vpos-primary hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
              title={`Remove ${valObj.value}`}
            >
              <Icon name="close-line" className="text-[12px]" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => handleAddValue()}
          placeholder={values.length === 0 ? 'Type a value and press Enter (e.g. S, M, L, XL)' : 'Add value and press Enter…'}
          className="flex-1 min-w-[150px] border-0 bg-transparent px-2 py-1 text-[13px] text-vpos-text outline-none placeholder:text-vpos-muted/60"
        />
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-vpos-muted">
        <span>Press <kbd className="rounded border border-vpos-line bg-vpos-subtle px-1 py-0.5 font-mono text-[10px] font-bold text-vpos-text">Enter</kbd> or <kbd className="rounded border border-vpos-line bg-vpos-subtle px-1 py-0.5 font-mono text-[10px] font-bold text-vpos-text">,</kbd> to separate values</span>
        <span className="font-semibold">{values.length} value{values.length === 1 ? '' : 's'} added</span>
      </div>

      {error ? <p className="mt-1 text-[12px] font-semibold text-vpos-red">{error}</p> : null}
    </div>
  )
}

function OptionFormModal({ open, option, onClose, onSave, isSaving }: OptionFormModalProps) {
  const { data: stores = [] } = useStoresRaw()
  const isEditing = Boolean(option)

  const [name, setName] = useState(option?.name ?? '')
  const [values, setValues] = useState<OptionValueItem[]>(option?.values ?? [])
  const [description, setDescription] = useState(option?.description ?? '')
  const [isGlobal, setIsGlobal] = useState(option?.isGlobal ?? true)
  const [storeIds, setStoreIds] = useState<number[]>(
    option?.storeIds ? Array.from(option.storeIds).map(Number).filter((id) => !isNaN(id) && id > 0) : []
  )
  const [status, setStatus] = useState<'Active' | 'Inactive'>(option?.status ?? 'Active')
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (open) {
      setName(option?.name ?? '')
      setValues(option?.values ? [...option.values] : [])
      setDescription(option?.description ?? '')
      setIsGlobal(option?.isGlobal ?? true)
      setStoreIds(option?.storeIds ? Array.from(option.storeIds).map(Number).filter((id) => !isNaN(id) && id > 0) : [])
      setStatus(option?.status ?? 'Active')
      setErrors({})
    }
  }, [open, option])

  const resetForm = () => {
    setName(option?.name ?? '')
    setValues(option?.values ? [...option.values] : [])
    setDescription(option?.description ?? '')
    setIsGlobal(option?.isGlobal ?? true)
    setStoreIds(option?.storeIds ? Array.from(option.storeIds).map(Number).filter((id) => !isNaN(id) && id > 0) : [])
    setStatus(option?.status ?? 'Active')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleToggleStore = (storeId: number) => {
    const sid = Number(storeId)
    setStoreIds((prev) => {
      const numericPrev = prev.map(Number)
      const exists = numericPrev.includes(sid)
      const updated = exists ? numericPrev.filter((id) => id !== sid) : [...numericPrev, sid]
      if (updated.length > 0 && errors.storeIds) {
        setErrors((e) => ({ ...e, storeIds: undefined }))
      }
      return updated
    })
  }

  const handleSelectAllStores = () => {
    const allIds = stores.map((s) => Number(s.id))
    setStoreIds(allIds)
    if (errors.storeIds) setErrors((e) => ({ ...e, storeIds: undefined }))
  }

  const handleClearStores = () => {
    setStoreIds([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedDesc = description.trim()

    const validation = validateForm({
      name: trimmedName,
      values,
      description: trimmedDesc,
      isGlobal,
      storeIds,
      status,
    })
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    const payload = {
      name: trimmedName,
      values,
      usedOnProducts: option?.usedOnProducts ?? 0,
      status,
      description: trimmedDesc || undefined,
      isGlobal,
      storeIds: isGlobal ? [] : storeIds,
    }

    await onSave({
      payload,
      isEdit: isEditing,
      id: option?.id,
    })

    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit option type' : 'Add option type'}
      description={isEditing ? 'Update product option type details.' : 'Create a new product option type.'}
      size="2xl"
      panelClassName="max-w-3xl sm:max-w-3xl w-full"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create option'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FormField
            label="Option Name"
            required
            name="name"
            placeholder="e.g. Size, Color, Ice level"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
            }}
          />
          {errors.name ? (
            <p className="mt-1 text-[12px] font-semibold text-vpos-red">{errors.name}</p>
          ) : null}
        </div>

        <ValuesTagInput
          values={values}
          onChange={(newValues) => {
            setValues(newValues)
            if (newValues.length > 0 && errors.values) {
              setErrors((prev) => ({ ...prev, values: undefined }))
            }
          }}
          error={errors.values}
        />

        <FormField
          label="Description"
          name="description"
          placeholder="e.g. Standard sizes available for apparel and beverages"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <SelectField
          label="Status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />

        {/* Coverage & Store Selection */}
        <div className="rounded-xl border border-vpos-line bg-[#fbfcfd] p-4">
          <label className="mb-2 block text-[13px] font-extrabold uppercase tracking-[.12em] text-vpos-primary">
            Store Coverage
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsGlobal(true)
                if (errors.storeIds) setErrors((e) => ({ ...e, storeIds: undefined }))
              }}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition',
                isGlobal
                  ? 'border-vpos-primary bg-vpos-sand/50 text-vpos-primary shadow-xs'
                  : 'border-vpos-line bg-white text-vpos-muted hover:bg-vpos-subtle',
              )}
            >
              <Icon name="global-line" />
              <span>All stores (Global)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGlobal(false)}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition',
                !isGlobal
                  ? 'border-vpos-primary bg-vpos-sand/50 text-vpos-primary shadow-xs'
                  : 'border-vpos-line bg-white text-vpos-muted hover:bg-vpos-subtle',
              )}
            >
              <Icon name="store-2-line" />
              <span>Specific stores</span>
            </button>
          </div>

          {!isGlobal && (
            <div className="mt-3.5 space-y-2 border-t border-vpos-line/80 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-vpos-text">
                  Select stores assigned to this option <span className="text-vpos-red">*</span>
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllStores}
                    className="font-bold text-vpos-primary hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-vpos-muted">•</span>
                  <button
                    type="button"
                    onClick={handleClearStores}
                    className="font-bold text-vpos-muted hover:text-vpos-text"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {errors.storeIds ? (
                <p className="text-[12px] font-semibold text-vpos-red">{errors.storeIds}</p>
              ) : null}

              <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-vpos-line bg-white p-2 sm:grid-cols-2">
                {stores.length > 0 ? (
                  stores.map((store) => {
                    const sid = Number(store.id)
                    const isChecked = storeIds.map(Number).includes(sid)
                    return (
                      <label
                        key={store.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition',
                          isChecked
                            ? 'border-vpos-primary bg-vpos-sand/30 font-semibold text-vpos-primary'
                            : 'border-vpos-line bg-white text-vpos-text hover:bg-vpos-subtle',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStore(sid)}
                          className="h-4 w-4 rounded accent-vpos-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[13px]">{store.name}</span>
                          {store.city || store.addressLine1 ? (
                            <small className="block truncate text-[10px] text-vpos-muted">
                              {[store.addressLine1, store.city].filter(Boolean).join(', ')}
                            </small>
                          ) : null}
                        </div>
                      </label>
                    )
                  })
                ) : (
                  <p className="col-span-full py-4 text-center text-[12px] text-vpos-muted">
                    No stores available. Please create a store first.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

export function ProductOptionsPage() {
  const { storeId, setStoreId } = useAdminStore()
  const { toast } = useToast()
  const { data: stores = [] } = useStoresRaw()
  
  // Postman Request #2: Get All Options by Business ID (GET /api/v1/products/attributes?businessId={{businessId}})
  const { data: apiOptions = [], isLoading } = useProductOptionsList()
  const createOptionMutation = useCreateProductOption()
  const updateOptionMutation = useUpdateProductOption()
  const deleteOptionMutation = useDeleteProductOption()

  const [formOpen, setFormOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<ProductOptionType | null>(null)
  const [viewingOption, setViewingOption] = useState<ProductOptionType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductOptionType | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const storeMap = useMemo(() => {
    const map = new Map<number, string>()
    stores.forEach((s) => map.set(Number(s.id), s.name))
    return map
  }, [stores])

  const options: ProductOptionType[] = useMemo(() => {
    if (apiOptions && Array.isArray(apiOptions)) {
      return apiOptions.map((o: any) => {
        const rawValues = Array.isArray(o.values) ? o.values : []
        const parsedValues: OptionValueItem[] = rawValues.map((v: any) => {
          if (typeof v === 'string') return { value: v }
          return { id: v.id, value: v.value || '' }
        })
        return {
          id: o.id,
          name: o.attributeName || o.name || '',
          values: parsedValues,
          usedOnProducts: o.usedOnProducts ?? 0,
          status: (o.status === 1 || o.status === 'Active' || o.status === 'ACTIVE') ? 'Active' : 'Inactive',
          description: o.description || '',
          isGlobal: o.isGlobal ?? true,
          storeIds: o.storeIds || [],
        }
      })
    }
    return []
  }, [apiOptions])

  const activeOptions = options.filter((o) => o.status === 'Active').length
  const totalUsedOnProducts = options.reduce((total, o) => total + (o.usedOnProducts || 0), 0)

  const openCreate = () => {
    setEditingOption(null)
    setFormOpen(true)
  }

  const openEdit = (option: ProductOptionType) => {
    setEditingOption(option)
    setFormOpen(true)
  }

  const openView = (option: ProductOptionType) => {
    setViewingOption(option)
  }

  const handleSave = async (data: {
    payload: {
      name: string
      values: OptionValueItem[]
      usedOnProducts: number
      status: 'Active' | 'Inactive'
      description?: string
      isGlobal: boolean
      storeIds?: number[]
    }
    isEdit: boolean
    id?: string | number
  }) => {
    setIsSaving(true)
    try {
      const formattedValues = data.payload.values.map((v) => ({
        ...(v.id ? { id: Number(v.id) } : {}),
        value: v.value,
      }))
      const apiStatus = data.payload.status === 'Active' ? 1 : 0

      if (data.isEdit && data.id !== undefined) {
        // Postman Request #4: Update Option & Values (PUT Edit) (PUT /api/v1/products/attributes/{{optionId}})
        await updateOptionMutation.mutateAsync({
          id: data.id,
          payload: {
            attributeName: data.payload.name,
            status: apiStatus,
            values: formattedValues,
            isGlobal: data.payload.isGlobal,
            storeIds: data.payload.storeIds,
            description: data.payload.description,
          },
        })
        toast(`${data.payload.name} was updated.`, 'success')
      } else {
        // Postman Request #1: Create Product Option (POST /api/v1/products/attributes)
        await createOptionMutation.mutateAsync({
          attributeName: data.payload.name,
          status: apiStatus,
          values: formattedValues,
          isGlobal: data.payload.isGlobal,
          storeIds: data.payload.storeIds,
          description: data.payload.description,
        })
        toast(`${data.payload.name} was created.`, 'success')
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to save option type via real API.', 'error')
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsSaving(true)
    try {
      // Postman Request #7: Soft Delete Option (DELETE /api/v1/products/attributes/{{optionId}})
      await deleteOptionMutation.mutateAsync(deleteTarget.id)
      toast(`${deleteTarget.name} was deleted.`, 'success')
      setDeleteTarget(null)
    } catch (err: any) {
      toast(err?.message || 'Failed to delete option type via real API.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const columns: DataTableColumn<ProductOptionType>[] = [
    {
      id: 'name',
      header: 'Option name',
      searchable: (o) => o.name,
      cell: (o) => (
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => openView(o)}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-vpos-sand text-[19px] text-vpos-primary">
            <Icon name="list-settings-line" />
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-[14px] text-vpos-text group-hover:text-vpos-primary transition-colors">
              {o.name}
            </strong>
            <small className="mt-0.5 block font-mono text-[11px] font-semibold text-vpos-muted">
              {o.values.length} values available
            </small>
          </div>
        </div>
      ),
    },
    {
      id: 'values',
      header: 'Values',
      searchable: (o) => o.values.map((v) => v.value).join(' '),
      cell: (o) => (
        <div className="flex flex-wrap gap-1">
          {o.values.map((v, idx) => (
            <span
              key={v.id ?? `${v.value}-${idx}`}
              className="inline-flex rounded-full border border-vpos-line bg-vpos-subtle px-2.5 py-0.5 text-[12px] font-bold text-vpos-text"
            >
              {v.value}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'used',
      header: 'Used on products',
      hideOnMobile: true,
      cell: (o) => (
        <span className="inline-flex min-w-8 justify-center rounded-[4px] border border-vpos-line bg-white px-2.5 py-1 font-mono text-[12px] font-bold">
          {o.usedOnProducts}
        </span>
      ),
    },
    {
      id: 'stores',
      header: 'Stores / Coverage',
      hideOnMobile: true,
      cell: (o) => {
        if (o.isGlobal ?? true) {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-vpos-sand px-2.5 py-0.5 text-[12px] font-bold text-vpos-primary">
              <Icon name="global-line" />
              All stores
            </span>
          )
        }

        const storeIdList = o.storeIds ? Array.from(o.storeIds) : []
        if (storeIdList.length === 0) {
          return <span className="text-[12px] text-vpos-muted">No stores</span>
        }

        if (storeIdList.length === 1) {
          const sName = storeMap.get(Number(storeIdList[0])) || `Store #${storeIdList[0]}`
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-vpos-subtle px-2.5 py-0.5 text-[12px] font-semibold text-vpos-text" title={sName}>
              <Icon name="store-2-line" className="text-vpos-muted text-[13px]" />
              <span className="max-w-[140px] truncate">{sName}</span>
            </span>
          )
        }

        const names = storeIdList.map((id) => storeMap.get(Number(id)) || `#${id}`).join(', ')
        return (
          <div className="flex flex-col gap-0.5" title={names}>
            <span className="inline-flex items-center gap-1 rounded-full bg-vpos-subtle px-2.5 py-0.5 text-[12px] font-semibold text-vpos-text">
              <Icon name="store-2-line" className="text-vpos-muted text-[13px]" />
              {storeIdList.length} stores
            </span>
            <span className="max-w-[160px] truncate text-[10px] text-vpos-muted font-medium">
              {names}
            </span>
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      searchable: (o) => o.status,
      cell: (o) => <Status value={o.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (o) => (
        <OptionActionsMenu
          option={o}
          onEdit={() => openEdit(o)}
          onView={() => openView(o)}
          onDelete={() => setDeleteTarget(o)}
        />
      ),
    },
  ]

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Option types for products — Size, Color, etc. (not stock items)"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Products', to: paths.products },
              { label: 'Options' },
            ]}
          />
          <Button variant="primary" onClick={openCreate}>
            <Icon name="add-line" /> Add option type
          </Button>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid overflow-hidden rounded-[4px] border border-vpos-line bg-white shadow-vpos sm:grid-cols-[1fr_1fr_1.4fr]">
          <ReferenceStat label="Option types" value={options.length} detail={`${activeOptions} active`} />
          <ReferenceStat label="Product placements" value={totalUsedOnProducts} detail="Across this catalog" />
          <div className="flex items-center gap-3 border-t border-vpos-line bg-vpos-subtle/55 px-5 py-4 sm:border-t-0 sm:border-l">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-[#fdf8f4] text-vpos-primary shadow-xs">
              <Icon name="information-line" />
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-vpos-muted">
              <strong className="text-vpos-text">Active management.</strong> Create, edit, view details, and delete option types for your product catalog.
            </p>
          </div>
        </section>

        <DataTable
          data={options}
          columns={columns}
          rowKey={(o) => String(o.id)}
          title="Option types"
          searchPlaceholder="Search option name or value…"
          pageSize={10}
          emptyMessage={isLoading ? 'Loading product options from API…' : 'No option types are configured.'}
          emptyIcon="list-settings-line"
        />

        <OptionDetailsModal
          open={Boolean(viewingOption)}
          option={viewingOption}
          onClose={() => setViewingOption(null)}
          onEdit={openEdit}
          stores={stores}
        />

        <OptionFormModal
          key={editingOption ? `edit-option-${editingOption.id}` : 'create-option'}
          open={formOpen}
          option={editingOption}
          onClose={() => {
            setFormOpen(false)
            setEditingOption(null)
          }}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !isSaving && setDeleteTarget(null)}
          title="Delete option type?"
          description="This option type will be permanently removed from the catalog."
          size="sm"
          footer={
            <>
              <Button variant="secondary" disabled={isSaving} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-vpos-red hover:bg-vpos-red"
                disabled={isSaving}
                onClick={confirmDelete}
              >
                {isSaving ? 'Deleting…' : 'Delete option type'}
              </Button>
            </>
          }
        >
          <p className="m-0 text-[14px] text-vpos-muted">
            {deleteTarget ? (
              <>
                You are deleting{' '}
                <strong className="text-vpos-text">{deleteTarget.name}</strong>.
                This action cannot be undone.
              </>
            ) : null}
          </p>
        </Modal>
      </main>
    </>
  )
}

function ReferenceStat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border-b border-vpos-line px-5 py-4 last:border-b-0 sm:border-r sm:border-b-0">
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-vpos-muted">{label}</span>
      <div className="mt-1.5 flex items-baseline gap-2">
        <strong className="text-[25px] tracking-[-0.04em] text-vpos-text">{value}</strong>
        <small className="text-[12px] font-semibold text-vpos-muted">{detail}</small>
      </div>
    </div>
  )
}
