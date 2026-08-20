import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { StoreLocationPicker } from '../../components/business/StoreLocationPicker'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const inputClass = 'auth-input auth-input--compact'

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
  usdToKhrExchangeRate: string
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
  usdToKhrExchangeRate: '4000',
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
        usdToKhrExchangeRate: Number(form.usdToKhrExchangeRate),
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
    <AuthShell eyebrow="FIRST, MAKE IT YOURS" title="A better shift starts here." description="Create your workspace, add your first store, and be ready to ring up sales in minutes." singleColumn>
      <StepProgress activeStep={step} />

      <form onSubmit={handleSubmit} noValidate className="auth-setup-form">
        {step === 0 ? <AccountStep form={form} updateField={updateField} /> : null}
        {step === 1 ? <BusinessStep form={form} updateField={updateField} /> : null}
        {step === 2 ? <StoreStep form={form} updateField={updateField} onLocationChange={updateLocation} /> : null}

        {error ? <p role="alert" className="auth-alert auth-alert--error auth-alert--setup">{error}</p> : null}

        <div className="auth-setup-actions">
          {step > 0 ? <Button type="button" variant="secondary" onClick={goBack} className="auth-back-button"><Icon name="arrow-left-line" /> Back</Button> : <span />}
          <Button type="submit" disabled={submitting} className="auth-setup-submit">
            {submitting ? 'Creating workspace…' : step === steps.length - 1 ? 'Create workspace' : 'Continue'}
            <Icon name={step === steps.length - 1 ? 'checkbox-circle-line' : 'arrow-right-line'} />
          </Button>
        </div>
      </form>

      <p className="auth-setup-footer">Already have an account? <Link to="/sign-in">Sign in <Icon name="arrow-up-right-line" /></Link></p>
    </AuthShell>
  )
}

function StepProgress({ activeStep }: { activeStep: number }) {
  return (
    <ol aria-label="Workspace setup progress" className="auth-step-progress">
      {steps.map((step, index) => {
        const isActive = index === activeStep
        const isComplete = index < activeStep
        return (
          <li key={step.label} className="auth-step-item">
            <div className={`auth-step-heading ${isActive ? 'auth-step-heading--active' : isComplete ? 'auth-step-heading--complete' : ''}`}>
              <span className={`auth-step-icon ${isActive ? 'auth-step-icon--active' : isComplete ? 'auth-step-icon--complete' : ''}`}>
                <Icon name={isComplete ? 'check-line' : step.icon} />
              </span>
              <span className="auth-step-label">{step.label}</span>
            </div>
            <span className={`auth-step-track ${index <= activeStep ? 'auth-step-track--active' : ''}`} />
          </li>
        )
      })}
    </ol>
  )
}

function AccountStep({ form, updateField }: StepProps) {
  return (
    <section className="auth-step-panel" aria-labelledby="account-step-title">
      <p className="auth-step-kicker">STEP 1 OF 3</p>
      <h3 id="account-step-title" className="auth-step-title">Create the owner account</h3>
      <p className="auth-step-description">This account owns the workspace and can invite the rest of your team later.</p>
      <div className="auth-step-fields">
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
    <section className="auth-step-panel" aria-labelledby="business-step-title">
      <p className="auth-step-kicker">STEP 2 OF 3</p>
      <h3 id="business-step-title" className="auth-step-title">Describe your business</h3>
      <p className="auth-step-description">These defaults organize prices and reports. You can add currencies and tax rules after setup.</p>
      <div className="auth-step-fields">
        <Field label="Business name" value={form.businessName} onChange={(value) => updateField('businessName', value)} required />
        <Field label="Business code" value={form.businessCode} onChange={(value) => updateField('businessCode', value.toUpperCase())} required />
        <Select
          label="Primary currency"
          className="auth-select"
          value={form.defaultCurrencyCode}
          onChange={(value) => updateField('defaultCurrencyCode', value)}
          options={[
            { value: 'USD', label: 'USD — US Dollar' },
            { value: 'KHR', label: 'KHR — Cambodian Riel' },
          ]}
        />
        <Field
          label="USD to KHR exchange rate"
          type="number"
          min="0.000001"
          step="0.000001"
          value={form.usdToKhrExchangeRate}
          onChange={(value) => updateField('usdToKhrExchangeRate', value)}
          required
        />
        <p className="auth-field-hint sm:col-span-2">How many riel equal USD 1. Example: 1 USD = 4,000 KHR. This is used when the POS changes currency.</p>
        <Field label="Time zone" value={form.timeZone} onChange={(value) => updateField('timeZone', value)} required />
      </div>
    </section>
  )
}

function StoreStep({ form, updateField, onLocationChange }: StepProps & { onLocationChange: (value: { latitude: string; longitude: string }) => void }) {
  return (
    <section className="auth-step-panel" aria-labelledby="store-step-title">
      <p className="auth-step-kicker">STEP 3 OF 3</p>
      <h3 id="store-step-title" className="auth-step-title">Add your first store</h3>
      <p className="auth-step-description">Every workspace starts with one store. You can add branches once setup is complete.</p>
      <div className="auth-step-fields">
        <Field label="Store name" value={form.storeName} onChange={(value) => updateField('storeName', value)} required />
        <Field label="Store code" value={form.storeCode} onChange={(value) => updateField('storeCode', value.toUpperCase())} required />
        <Field label="Street address" value={form.storeAddressLine1} onChange={(value) => updateField('storeAddressLine1', value)} required className="sm:col-span-2" />
        <Field label="City" value={form.storeCity} onChange={(value) => updateField('storeCity', value)} required />
        <Field label="Country code" value={form.storeCountryCode} onChange={(value) => updateField('storeCountryCode', value.toUpperCase())} required />
      </div>
      <div className="auth-location-section">
        <StoreLocationPicker latitude={form.storeLatitude} longitude={form.storeLongitude} onChange={onLocationChange} />
      </div>
    </section>
  )
}

type StepProps = { form: RegistrationForm; updateField: <Key extends keyof RegistrationForm>(key: Key, value: RegistrationForm[Key]) => void }
type FieldProps = { label: string; value: string; onChange: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

function Field({ label, value, onChange, ...props }: FieldProps) {
  return <label className={`auth-field ${props.className ?? ''}`}><span className="auth-field-label">{label}{props.required ? <b> *</b> : null}</span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>
}


function validateStep(form: RegistrationForm, step: number) {
  if (step === 0) {
    if (!form.fullName.trim() || !form.username.trim() || !form.password || !form.confirmPassword) return 'Complete the required account fields to continue.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
  }
  if (step === 1 && (!form.businessName.trim() || !form.businessCode.trim() || !form.timeZone.trim())) return 'Complete the required business fields to continue.'
  if (step === 1 && (!Number.isFinite(Number(form.usdToKhrExchangeRate)) || Number(form.usdToKhrExchangeRate) <= 0)) return 'Enter a positive USD to KHR exchange rate.'
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
