import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { UploadZone } from '../ui/UploadZone'
import { useAuth } from '../../context/AuthContext'

export function BusinessBrandForm() {
  const { user, updateBusinessBrand } = useAuth()
  const [name, setName] = useState(user?.business.name ?? '')
  const [logoUrl, setLogoUrl] = useState(user?.business.logoUrl)
  const [notice, setNotice] = useState('')
  const logoInput = useRef<HTMLInputElement>(null)

  if (!user) return null

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 1_500_000) {
      setNotice('Choose a PNG, JPG, or WEBP image smaller than 1.5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogoUrl(typeof reader.result === 'string' ? reader.result : undefined)
      setNotice('Logo ready to save.')
    }
    reader.readAsDataURL(file)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNotice('Enter a business name before saving.')
      return
    }
    try {
      await updateBusinessBrand({ name: trimmedName, logoUrl })
      setName(trimmedName)
      setNotice('Business identity saved. Your sidebar is updated.')
    } catch {
      setNotice('Failed to save. Try again.')
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_265px]">
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-[12px] font-[750] tracking-[.02em] text-vpos-primary-2">Business name <b className="text-vpos-red">*</b></span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} className="h-11 w-full rounded-lg border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none placeholder:text-vpos-muted focus:border-vpos-primary focus:shadow-[0_0_0_3px_rgb(22_112_91_/_0.12)]" placeholder="Your business name" />
          <small className="mt-2 block text-[12px] text-vpos-muted">This name appears at the top of your workspace navigation.</small>
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3"><span className="text-[12px] font-[750] tracking-[.02em] text-vpos-primary-2">Business logo</span><button type="button" onClick={() => logoInput.current?.click()} className="border-0 bg-transparent p-0 text-[12px] font-extrabold text-vpos-primary hover:underline">Choose image</button></div>
          <UploadZone title="Drop your logo here" description="PNG, JPG, or WEBP · max 1.5 MB" tip="A square image works best in the compact sidebar." multiple={false} onFiles={(files) => handleFile(files?.[0])} className="min-h-[142px]" />
          <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => handleFile(event.target.files?.[0])} />
        </div>

        {notice ? <p aria-live="polite" className="m-0 rounded-lg border border-vpos-primary/15 bg-vpos-sand/60 px-3 py-2.5 text-[13px] font-medium text-vpos-primary-2">{notice}</p> : null}
        <Button type="submit" className="rounded-lg"><Icon name="save-3-line" /> Save business identity</Button>
      </div>

      <aside className="rounded-2xl border border-vpos-line bg-vpos-subtle/45 p-5">
        <p className="m-0 text-[12px] font-extrabold tracking-[.12em] text-vpos-muted">SIDEBAR PREVIEW</p>
        <div className="mt-4 rounded-xl bg-vpos-dark p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/15 text-[20px] text-white">{logoUrl ? <img src={logoUrl} alt="Business logo preview" className="h-full w-full object-cover" /> : <Icon name="store-3-fill" />}</span>
            <span className="min-w-0"><strong className="block truncate text-[16px] text-white">{name || 'Your business'}</strong><small className="mt-1 block text-[10px] font-bold tracking-[1.2px] text-white/45">{user.business.type.toUpperCase()}</small></span>
          </div>
        </div>
        <p className="mt-4 mb-0 text-[12px] leading-5 text-vpos-muted">Changing the brand only affects this local workspace profile. It is ready to connect to a business-profile backend endpoint.</p>
      </aside>
    </form>
  )
}
