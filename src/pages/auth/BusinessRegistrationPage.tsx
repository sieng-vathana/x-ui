import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { StoreLocationPicker } from '../../components/business/StoreLocationPicker'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const inputClass = 'h-11 w-full rounded-lg border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none placeholder:text-vpos-muted transition focus:border-vpos-primary focus:shadow-[0_0_0_3px_rgb(22_112_91_/_0.12)]'

const steps = [
  { label: 'Owner account', icon: 'user-line' },
  { label: 'Business details', icon: 'building-line' },
  { label: 'First store', icon: 'store-3-line' },
] as const

const DRAFT_STORAGE_KEY = 'vpos.business-registration-draft.v1'

type RegistrationForm = {
  fullName: string
  username: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  businessName: string
  businessCode: string
  defaultCurrencyCode: string
  timeZone: string
  storeName: string
  storeCode: string
  storeAddressLine1: string
  storeCity: string
  storeCountryCode: string
  storeLatitude: string
  storeLongitude: string
}

const initialForm: RegistrationForm = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  businessName: '',
  businessCode: '',
  defaultCurrencyCode: 'USD',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh',
  storeName: '',
  storeCode: 'MAIN',
  storeAddressLine1: '',
  storeCity: '',
  storeCountryCode: 'KH',
  storeLatitude: '',
  storeLongitude: '',
}

function getDraftForm(): RegistrationForm {
  try {
    const rawDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!rawDraft) return initialForm
    const draft = JSON.parse(rawDraft) as Partial<RegistrationForm>
    return { ...initialForm, ...draft, password: '', confirmPassword: '' }
  } catch {
    return initialForm
  }
}

function saveDraftForm(form: RegistrationForm) {
  const { password: _password, confirmPassword: _confirmPassword, ...safeDraft } = form
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(safeDraft))
  } catch {
    // The setup can still continue when session storage is unavailable.
  }
}

function getStepFromQuery(stepValue: string | null) {
  const requestedStep = Number(stepValue)
  return Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= steps.length ? requestedStep - 1 : 0
}

export function BusinessRegistrationPage() {
  const { isAuthenticated, register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedStep = searchParams.get('step')
  const [form, setForm] = useState(getDraftForm)
  const [step, setStep] = useState(() => getStepFromQuery(requestedStep))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setStep(getStepFromQuery(requestedStep))
  }, [requestedStep])

  useEffect(() => {
    saveDraftForm(form)
  }, [form])

  const updateField = <Key extends keyof RegistrationForm>(key: Key, value: RegistrationForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const updateLocation = useCallback((location: { latitude: string; longitude: string }) => {
    setForm((current) => ({ ...current, storeLatitude: location.latitude, storeLongitude: location.longitude }))
  }, [])

  const goToStep = (nextStep: number) => {
    setError('')
    setStep(nextStep)
    setSearchParams({ step: String(nextStep + 1) }, { replace: true })
  }

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = step === steps.length - 1 ? validateAllSteps(form) : validateStep(form, step)
    if (validationError) {
      setError(validationError)
      const firstInvalidStep = getFirstInvalidStep(form)
      if (step === steps.length - 1 && firstInvalidStep < step) goToStep(firstInvalidStep)
      return
    }

    setError('')
    if (step < steps.length - 1) {
      goToStep(step + 1)
      return
    }

    setSubmitting(true)
    try {
      await register({
        fullName: form.fullName,
        username: form.username,
        password: form.password,
        email: form.email || undefined,
        phone: form.phone || undefined,
        businessName: form.businessName,
        businessCode: form.businessCode,
        defaultCurrencyCode: form.defaultCurrencyCode,
        pricesIncludeTax: true,
        timeZone: form.timeZone,
        fiscalYearStartMonth: 1,
        storeName: form.storeName,
        storeCode: form.storeCode,
        storeAddressLine1: form.storeAddressLine1,
        storeCity: form.storeCity,
        storeCountryCode: form.storeCountryCode,
        storeLatitude: Number(form.storeLatitude),
        storeLongitude: Number(form.storeLongitude),
      })
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      toast('Workspace created. Welcome to V-POS!', 'success')
      navigate('/', { replace: true })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'We could not create your workspace.'
      setError(message)
      toast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    goToStep(Math.max(0, step - 1))
  }

  return (
    <AuthShell eyebrow="CREATE YOUR WORKSPACE" title="Set up your business" description="Three focused steps. Your first store is created with your account." singleColumn>
      <StepProgress activeStep={step} />

      <form onSubmit={handleSubmit} noValidate className="mt-8">
        {step === 0 ? <AccountStep form={form} updateField={updateField} /> : null}
        {step === 1 ? <BusinessStep form={form} updateField={updateField} /> : null}
        {step === 2 ? <StoreStep form={form} updateField={updateField} onLocationChange={updateLocation} /> : null}

        {error ? <p role="alert" className="mt-6 mb-0 rounded-lg border border-vpos-red/20 bg-vpos-red-bg px-3 py-2.5 text-[13px] font-medium text-vpos-red">{error}</p> : null}

        <div className="mt-7 flex items-center gap-3 border-t border-vpos-line pt-5">
          {step > 0 ? <Button type="button" variant="secondary" onClick={goBack} className="h-11 rounded-lg px-4"><Icon name="arrow-left-line" /> Back</Button> : <span />}
          <Button type="submit" disabled={submitting} className="ml-auto h-11 rounded-lg px-5">
            {submitting ? 'Creating workspace…' : step === steps.length - 1 ? 'Create workspace' : 'Continue'}
            <Icon name={step === steps.length - 1 ? 'checkbox-circle-line' : 'arrow-right-line'} />
          </Button>
        </div>
      </form>

      <p className="mt-7 mb-0 text-center text-[14px] text-vpos-muted">Already have an account? <Link to="/sign-in" className="font-extrabold text-vpos-primary no-underline hover:underline">Sign in</Link></p>
    </AuthShell>
  )
}

function StepProgress({ activeStep }: { activeStep: number }) {
  return (
    <ol aria-label="Workspace setup progress" className="m-0 grid list-none grid-cols-3 gap-2 p-0">
      {steps.map((step, index) => {
        const isActive = index === activeStep
        const isComplete = index < activeStep
        return (
          <li key={step.label} className="min-w-0">
            <div className={`flex items-center gap-2 ${isActive || isComplete ? 'text-vpos-primary' : 'text-vpos-muted'}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] ${isActive ? 'bg-vpos-primary text-white shadow-sm shadow-vpos-primary/25' : isComplete ? 'bg-vpos-sand text-vpos-primary' : 'bg-vpos-subtle text-vpos-muted'}`}>
                <Icon name={isComplete ? 'check-line' : step.icon} />
              </span>
              <span className="hidden text-[12px] font-extrabold sm:block">{step.label}</span>
            </div>
            <span className={`mt-2 block h-1 rounded-full ${index <= activeStep ? 'bg-vpos-primary' : 'bg-vpos-line'}`} />
          </li>
        )
      })}
    </ol>
  )
}

function AccountStep({ form, updateField }: StepProps) {
  return (
    <section aria-labelledby="account-step-title">
      <p className="m-0 text-[12px] font-extrabold tracking-[.12em] text-vpos-primary">STEP 1 OF 3</p>
      <h3 id="account-step-title" className="mt-2 mb-1 text-[21px] font-extrabold tracking-tight text-vpos-text">Create the owner account</h3>
      <p className="mt-0 mb-5 text-[14px] leading-5 text-vpos-muted">This account owns the workspace and can invite the rest of your team later.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" value={form.fullName} onChange={(value) => updateField('fullName', value)} required autoComplete="name" />
        <Field label="Username" value={form.username} onChange={(value) => updateField('username', value)} required autoComplete="username" />
        <Field label="Email" type="email" value={form.email} onChange={(value) => updateField('email', value)} autoComplete="email" />
        <Field label="Phone" type="tel" value={form.phone} onChange={(value) => updateField('phone', value)} autoComplete="tel" />
        <Field label="Password" type="password" value={form.password} onChange={(value) => updateField('password', value)} required autoComplete="new-password" />
        <Field label="Confirm password" type="password" value={form.confirmPassword} onChange={(value) => updateField('confirmPassword', value)} required autoComplete="new-password" />
      </div>
    </section>
  )
}

function BusinessStep({ form, updateField }: StepProps) {
  return (
    <section aria-labelledby="business-step-title">
      <p className="m-0 text-[12px] font-extrabold tracking-[.12em] text-vpos-primary">STEP 2 OF 3</p>
      <h3 id="business-step-title" className="mt-2 mb-1 text-[21px] font-extrabold tracking-tight text-vpos-text">Describe your business</h3>
      <p className="mt-0 mb-5 text-[14px] leading-5 text-vpos-muted">These defaults organize prices and reports. You can add currencies and tax rules after setup.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" value={form.businessName} onChange={(value) => updateField('businessName', value)} required />
        <Field label="Business code" value={form.businessCode} onChange={(value) => updateField('businessCode', value.toUpperCase())} required />
        <Select
          label="Primary currency"
          value={form.defaultCurrencyCode}
          onChange={(value) => updateField('defaultCurrencyCode', value)}
          options={[
            { value: 'USD', label: 'USD — US Dollar' },
            { value: 'KHR', label: 'KHR — Cambodian Riel' },
          ]}
        />
        <Field label="Time zone" value={form.timeZone} onChange={(value) => updateField('timeZone', value)} required />
      </div>
    </section>
  )
}

function StoreStep({ form, updateField, onLocationChange }: StepProps & { onLocationChange: (value: { latitude: string; longitude: string }) => void }) {
  return (
    <section aria-labelledby="store-step-title">
      <p className="m-0 text-[12px] font-extrabold tracking-[.12em] text-vpos-primary">STEP 3 OF 3</p>
      <h3 id="store-step-title" className="mt-2 mb-1 text-[21px] font-extrabold tracking-tight text-vpos-text">Add your first store</h3>
      <p className="mt-0 mb-5 text-[14px] leading-5 text-vpos-muted">Every workspace starts with one store. You can add branches once setup is complete.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Store name" value={form.storeName} onChange={(value) => updateField('storeName', value)} required />
        <Field label="Store code" value={form.storeCode} onChange={(value) => updateField('storeCode', value.toUpperCase())} required />
        <Field label="Street address" value={form.storeAddressLine1} onChange={(value) => updateField('storeAddressLine1', value)} required className="sm:col-span-2" />
        <Field label="City" value={form.storeCity} onChange={(value) => updateField('storeCity', value)} required />
        <Field label="Country code" value={form.storeCountryCode} onChange={(value) => updateField('storeCountryCode', value.toUpperCase())} required />
      </div>
      <div className="mt-6 border-t border-vpos-line pt-6">
        <StoreLocationPicker latitude={form.storeLatitude} longitude={form.storeLongitude} onChange={onLocationChange} />
      </div>
    </section>
  )
}

type StepProps = { form: RegistrationForm; updateField: <Key extends keyof RegistrationForm>(key: Key, value: RegistrationForm[Key]) => void }
type FieldProps = { label: string; value: string; onChange: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

function Field({ label, value, onChange, ...props }: FieldProps) {
  return <label className={`block ${props.className ?? ''}`}><span className="mb-2 block text-[12px] font-[750] text-vpos-primary-2">{label}{props.required ? <b className="text-vpos-red"> *</b> : null}</span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>
}


function validateStep(form: RegistrationForm, step: number) {
  if (step === 0) {
    if (!form.fullName.trim() || !form.username.trim() || !form.password || !form.confirmPassword) return 'Complete the required account fields to continue.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
  }
  if (step === 1 && (!form.businessName.trim() || !form.businessCode.trim() || !form.timeZone.trim())) return 'Complete the required business fields to continue.'
  if (step === 2) {
    if (!form.storeName.trim() || !form.storeCode.trim() || !form.storeAddressLine1.trim() || !form.storeCity.trim() || !form.storeCountryCode.trim()) return 'Complete the required store details to create your workspace.'
    if (!Number.isFinite(Number(form.storeLatitude)) || !Number.isFinite(Number(form.storeLongitude))) return 'Choose your store location on the map or enter valid coordinates.'
  }
  return ''
}

function getFirstInvalidStep(form: RegistrationForm) {
  for (let index = 0; index < steps.length; index += 1) {
    if (validateStep(form, index)) return index
  }
  return steps.length
}

function validateAllSteps(form: RegistrationForm) {
  const invalidStep = getFirstInvalidStep(form)
  return invalidStep === steps.length ? '' : validateStep(form, invalidStep)
}
