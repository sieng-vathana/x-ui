import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { fileApi, fileContentPath, resolveImageUrl } from '../../features/files/fileApi'
import { useCreateStore, useUpdateStore } from '../../features/stores/useStores'
import type { BffStore } from '../../features/stores/types'
import { StoreLocationPicker } from '../business/StoreLocationPicker'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { UploadZone } from '../ui/UploadZone'

const FORM_ID = 'store-form'

type StoreImageDraft = {
  key: string
  imageUrl: string
  previewUrl: string
  isPrimary: boolean
  sortOrder: number
}

interface StoreFormModalProps {
  open: boolean
  onClose: () => void
  store?: BffStore | null
}

export function StoreFormModal({ open, onClose, store = null }: StoreFormModalProps) {
  const createStore = useCreateStore()
  const updateStore = useUpdateStore()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [countryCode, setCountryCode] = useState('KH')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [images, setImages] = useState<StoreImageDraft[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const objectUrlsRef = useRef(new Set<string>())
  const lastPopulatedIdRef = useRef<number | null>(null)
  const isEditing = Boolean(store)
  const isPending = createStore.isPending || updateStore.isPending

  const revokePreview = useCallback((url: string) => {
    if (!url.startsWith('blob:')) return
    URL.revokeObjectURL(url)
    objectUrlsRef.current.delete(url)
  }, [])

  const resetForm = useCallback(() => {
    setName('')
    setCode('')
    setAddressLine1('')
    setCity('')
    setCountryCode('KH')
    setPhone('')
    setEmail('')
    setLatitude('')
    setLongitude('')
    setImages((current) => {
      current.forEach((image) => revokePreview(image.previewUrl))
      return []
    })
    setUploadError(null)
    setSubmitError(null)
  }, [revokePreview])

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current.clear()
  }, [])

  useEffect(() => {
    if (!open) return
    if (!store) {
      if (lastPopulatedIdRef.current === null) return
      lastPopulatedIdRef.current = null
      resetForm()
      return
    }
    if (store.id === lastPopulatedIdRef.current) return
    lastPopulatedIdRef.current = store.id
    setName(store.name)
    setCode(store.code)
    setAddressLine1(store.addressLine1)
    setCity(store.city)
    setCountryCode(store.countryCode)
    setPhone(store.phone ?? '')
    setEmail(store.email ?? '')
    setLatitude(store.latitude?.toString() ?? '')
    setLongitude(store.longitude?.toString() ?? '')
    void Promise.all((store.images ?? []).map(async (image, index) => ({ image, index, url: await resolveImageUrl(image.imageUrl) })))
      .then((resolvedImages) => {
        if (lastPopulatedIdRef.current !== store.id) return
        setImages((current) => {
          current.forEach((image) => revokePreview(image.previewUrl))
          const displayableImages = resolvedImages.filter((item) => item.url)
          const hasPrimary = displayableImages.some(({ image }) => image.isPrimary)
          return displayableImages.map(({ image, index, url }) => ({
            key: String(image.id),
            imageUrl: image.fileId ? fileContentPath(image.fileId) : image.imageUrl,
            previewUrl: url!,
            isPrimary: image.isPrimary || (!hasPrimary && index === 0),
            sortOrder: image.sortOrder ?? index,
          }))
        })
      })
    setUploadError(null)
    setSubmitError(null)
  }, [open, resetForm, revokePreview, store])

  const handleFiles = useCallback(async (files: FileList | null) => {
    const selections = Array.from(files ?? [])
    if (!selections.length) return
    setIsUploading(true)
    setUploadError(null)
    const results = await Promise.allSettled(selections.map(async (file) => ({ file, uploaded: await fileApi.upload(file) })))
    const completed = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
    const failed = results.length - completed.length

    if (completed.length) {
      setImages((current) => {
        const hasPrimary = current.some((image) => image.isPrimary)
        const additions = completed.map(({ file, uploaded }, index) => {
          const previewUrl = URL.createObjectURL(file)
          objectUrlsRef.current.add(previewUrl)
          return {
            key: `${uploaded.id}-${Date.now()}-${index}`,
            imageUrl: fileContentPath(uploaded.id),
            previewUrl,
            isPrimary: !hasPrimary && index === 0,
            sortOrder: current.length + index,
          }
        })
        return [...current, ...additions]
      })
    }
    if (failed) setUploadError(`${failed} image${failed === 1 ? '' : 's'} could not be uploaded.`)
    setIsUploading(false)
  }, [])

  const setPrimaryImage = (key: string) => {
    setImages((current) => current.map((image) => ({ ...image, isPrimary: image.key === key })))
  }

  const removeImage = (key: string) => {
    setImages((current) => {
      const removed = current.find((image) => image.key === key)
      if (removed) revokePreview(removed.previewUrl)
      const remaining = current.filter((image) => image.key !== key)
      const primaryKey = remaining.some((image) => image.isPrimary) ? undefined : remaining[0]?.key
      return remaining.map((image, index) => ({ ...image, isPrimary: primaryKey ? image.key === primaryKey : image.isPrimary, sortOrder: index }))
    })
  }

  const updateLocation = useCallback(({ latitude: nextLatitude, longitude: nextLongitude }: { latitude: string; longitude: string }) => {
    setLatitude(nextLatitude)
    setLongitude(nextLongitude)
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)
    if (!name.trim() || !code.trim() || !addressLine1.trim() || !city.trim() || !countryCode.trim()) {
      setSubmitError('Please fill in all required fields.')
      return
    }
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      setSubmitError('Choose your store location on the map or enter valid coordinates.')
      return
    }

    const request = {
      name: name.trim(),
      code: code.trim(),
      addressLine1: addressLine1.trim(),
      city: city.trim(),
      countryCode: countryCode.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      latitude: Number(latitude),
      longitude: Number(longitude),
      images: images.map((image, index) => ({ imageUrl: image.imageUrl, isPrimary: image.isPrimary, sortOrder: index })),
      ...(store ? {
        addressLine2: store.addressLine2 ?? undefined,
        landmark: store.landmark ?? undefined,
        stateProvince: store.stateProvince ?? undefined,
        postalCode: store.postalCode ?? undefined,
        alternatePhone: store.alternatePhone ?? undefined,
        website: store.website ?? undefined,
      } : {}),
    }

    try {
      if (store) {
        await updateStore.mutateAsync({ id: store.id, request })
        toast('Store updated.', 'success')
      } else {
        await createStore.mutateAsync(request)
        toast('Store created.', 'success')
      }
      resetForm()
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} store.`)
    }
  }

  const close = () => { resetForm(); onClose() }

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEditing ? 'Edit store' : 'Add store'}
      description={isEditing ? 'Update this store location, logo, and supporting images.' : 'Create a store with a primary logo and supporting images.'}
      size="lg"
      footer={<><Button variant="secondary" onClick={close} disabled={isPending}>Cancel</Button><Button variant="primary" form={FORM_ID} type="submit" disabled={isPending || isUploading}>{isPending ? (isEditing ? 'Saving…' : 'Creating…') : isEditing ? 'Save changes' : 'Create store'}</Button></>}
    >
      <form ref={formRef} id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {submitError ? <div className="rounded-lg bg-vpos-red-bg px-3 py-2 text-[13px] font-bold text-vpos-red">{submitError}</div> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><FormField label="Store name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Riverside Flagship" /></div>
          <FormField label="Store code" required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. PNH-001" />
        </div>

        <div className="border-t border-vpos-line pt-5">
          <StoreLocationPicker
            key={store?.id ?? 'new-store'}
            latitude={latitude}
            longitude={longitude}
            onChange={updateLocation}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+855 23 123 456" />
          <div className="md:col-span-2"><FormField label="Address line 1" required value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} placeholder="No. 123, Street 456" /></div>
          <FormField label="City" required value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Phnom Penh" />
          <FormField label="Country code" required value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} placeholder="KH" maxLength={2} />
          <div className="md:col-span-2"><FormField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="store@example.com" /></div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3"><span className="block text-[12px] font-[750] tracking-[0.02em] text-vpos-primary-2">Store images</span><span className="text-[12px] text-vpos-muted">Choose one image as the primary logo.</span></div>
          {images.length ? <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image) => <div key={image.key} className="relative overflow-hidden rounded-[4px] border border-vpos-line bg-vpos-subtle"><img src={image.previewUrl} alt="Store upload preview" className="aspect-square w-full object-cover" /><div className="absolute right-2 bottom-2 left-2 flex gap-1"><button type="button" onClick={() => setPrimaryImage(image.key)} className={`min-h-7 flex-1 rounded-[3px] px-2 text-[11px] font-semibold ${image.isPrimary ? 'bg-vpos-primary text-white' : 'bg-white/90 text-vpos-text'}`}>{image.isPrimary ? 'Primary logo' : 'Set as primary'}</button><button type="button" onClick={() => removeImage(image.key)} className="grid h-7 w-7 place-items-center rounded-[3px] bg-vpos-red text-white" aria-label="Remove image"><Icon name="delete-bin-line" /></button></div></div>)}</div> : null}
          <UploadZone title={isUploading ? 'Uploading images…' : 'Click to upload store images'} description="PNG, JPG or WEBP • Max 5 MB each" tip="Upload multiple images. The primary image is used as the store logo." multiple onFiles={handleFiles} />
          {uploadError ? <p className="mt-1 text-[12px] font-bold text-vpos-red">{uploadError}</p> : null}
        </div>
      </form>
    </Modal>
  )
}
