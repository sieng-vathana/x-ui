import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export function SignInPage() {
  const { isAuthenticated, isRestoring, signIn } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSessionExpired = new URLSearchParams(location.search).get('reason') === 'session_expired'

  if (isAuthenticated) return <Navigate to="/" replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn({ username, password })
      toast('Signed in successfully.', 'success')
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to sign in. Please try again.'
      setError(message)
      toast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell eyebrow="WORKSPACE ACCESS" title="Open your register" description="Sign in with the username created for your V-POS workspace.">
      <form onSubmit={submit} noValidate className="space-y-5">
        {isSessionExpired ? (
          <div role="alert" className="m-0 flex items-center gap-3 rounded-lg border border-vpos-gold/30 bg-vpos-sand/60 px-3.5 py-3 text-[13px] font-medium text-vpos-dark">
            <Icon name="time-line" className="text-[18px] text-vpos-primary shrink-0" />
            <span>Your session expired after 30 minutes of inactivity. Please sign in again.</span>
          </div>
        ) : null}
        <Field label="Username" autoComplete="username" value={username} onChange={setUsername} placeholder="e.g. vathana.admin" required />
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-[12px] font-[750] tracking-[.02em] text-vpos-primary-2">Password <b className="text-vpos-red">*</b></label>
            <span className="text-[12px] text-vpos-muted">Your workspace password</span>
          </div>
          <div className="relative">
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required className={inputClass} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-3 -translate-y-1/2 border-0 bg-transparent p-1 text-[18px] text-vpos-muted hover:text-vpos-primary"><Icon name={showPassword ? 'eye-off-line' : 'eye-line'} /></button>
          </div>
        </div>
        {error ? <p role="alert" className="m-0 rounded-lg border border-vpos-red/20 bg-vpos-red-bg px-3 py-2.5 text-[13px] font-medium text-vpos-red">{error}</p> : null}
        <div className="flex items-start gap-2.5 rounded-xl border border-vpos-line bg-vpos-subtle/60 px-3.5 py-3 text-[12px] leading-5 text-vpos-muted"><Icon name="shield-check-line" className="mt-0.5 text-[16px] text-vpos-primary" /><span>Your session is secured by browser-only access and refresh cookies. V-POS does not save your access token in local storage.</span></div>
        <Button type="submit" disabled={submitting || isRestoring} className="h-12 w-full rounded-lg">{submitting ? 'Checking access…' : 'Open workspace'} <Icon name="arrow-right-line" /></Button>
      </form>
      <div className="mt-7 border-t border-vpos-line pt-5"><p className="m-0 text-[13px] leading-5 text-vpos-muted"><strong className="text-vpos-text">New here?</strong> <Link to="/register-business" className="font-extrabold text-vpos-primary no-underline hover:underline">Create your workspace account</Link>.</p></div>
    </AuthShell>
  )
}

type AuthFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

function Field({ label, value, onChange, ...props }: AuthFieldProps) {
  return <label className="block"><span className="mb-2 block text-[12px] font-[750] tracking-[.02em] text-vpos-primary-2">{label} <b className="text-vpos-red">*</b></span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>
}

const inputClass = 'h-12 w-full rounded-lg border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none placeholder:text-vpos-muted transition focus:border-vpos-primary focus:shadow-[0_0_0_3px_rgb(22_112_91_/_0.12)]'
