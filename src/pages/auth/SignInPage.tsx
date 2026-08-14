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
    <AuthShell eyebrow="WELCOME BACK" title="Pick up where you left off." description="Sign in to open your workspace and keep the floor moving.">
      <form onSubmit={submit} noValidate className="auth-form">
        {isSessionExpired ? (
          <div role="alert" className="auth-alert auth-alert--notice">
            <Icon name="time-line" />
            <span>Your session expired after 30 minutes of inactivity. Please sign in again.</span>
          </div>
        ) : null}
        <div className="auth-form-fields">
          <Field label="Username" autoComplete="username" value={username} onChange={setUsername} placeholder="e.g. vathana.admin" required />
          <div className="auth-field">
            <div className="auth-field-heading">
              <label htmlFor="password" className="auth-field-label">Password <b>*</b></label>
              <span className="auth-field-hint">Your workspace password</span>
            </div>
            <div className="auth-password-wrap">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required className="auth-input" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="auth-password-toggle"><Icon name={showPassword ? 'eye-off-line' : 'eye-line'} /></button>
            </div>
          </div>
        </div>
        {error ? <p role="alert" className="auth-alert auth-alert--error">{error}</p> : null}
        <div className="auth-security-note"><span className="auth-security-icon"><Icon name="shield-check-line" /></span><span><strong>Private session.</strong> Your access stays in secure browser cookies — never local storage.</span></div>
        <Button type="submit" disabled={submitting || isRestoring} className="auth-submit-button">{submitting ? 'Checking access…' : 'Open workspace'} <Icon name="arrow-right-line" /></Button>
      </form>
      <div className="auth-form-footer"><span>New here?</span> <Link to="/register-business">Create your workspace account <Icon name="arrow-up-right-line" /></Link></div>
    </AuthShell>
  )
}

type AuthFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

function Field({ label, value, onChange, ...props }: AuthFieldProps) {
  return <label className="auth-field"><span className="auth-field-label">{label} <b>*</b></span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="auth-input" /></label>
}
