import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authApi, MfaRequiredError, type MfaChallenge, type MfaMethod } from '../../features/auth/authApi'
import { parseServerTime } from '../../lib/serverTime'

export function SignInPage() {
  const { isAuthenticated, isRestoring, signIn, signInWithMfa } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mfa, setMfa] = useState<{ methods: MfaMethod[]; selectionToken?: string } | null>(null)
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null)
  const [sendingTo, setSendingTo] = useState<MfaMethod | null>(null)
  const [mfaCode, setMfaCode] = useState('')

  const isSessionExpired = new URLSearchParams(location.search).get('reason') === 'session_expired'

  if (isAuthenticated) return <Navigate to="/" replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (challenge) {
        await signInWithMfa({ username, challengeToken: challenge.token, code: mfaCode, method: challenge.method })
      } else {
        await signIn({ username, password })
      }
      toast('Signed in successfully.', 'success')
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    } catch (reason) {
      if (reason instanceof MfaRequiredError) {
        setMfa({ methods: reason.methods, selectionToken: reason.selectionToken })
        setChallenge(reason.challenge ?? null)
        setPassword('')
        setError('')
        return
      }
      const message = reason instanceof Error ? reason.message : 'Unable to sign in. Please try again.'
      setError(message)
      toast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const sendCode = async (method: MfaMethod) => {
    if (!mfa?.selectionToken) return
    setError('')
    setSendingTo(method)
    try {
      setChallenge(await authApi.sendMfaCode({ username, selectionToken: mfa.selectionToken, method }))
      setMfaCode('')
      toast(method === 'EMAIL' ? 'Verification code sent to your email.' : 'Verification code sent to your Telegram.', 'success')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The verification code could not be sent.'
      setError(message)
      toast(message, 'error')
    } finally {
      setSendingTo(null)
    }
  }

  const backToPassword = () => {
    setMfa(null)
    setChallenge(null)
    setMfaCode('')
    setError('')
  }

  const choosing = Boolean(mfa && !challenge)
  const otherMethod = challenge && mfa ? mfa.methods.find((method) => method !== challenge.method) : undefined

  return (
    <AuthShell variant="reference" eyebrow="WELCOME BACK" title="Pick up where you left off." description="Sign in to open your workspace and keep the floor moving.">
      <form onSubmit={submit} noValidate className="auth-form">
        {isSessionExpired ? (
          <div role="alert" className="auth-alert auth-alert--notice">
            <Icon name="time-line" />
            <span>Your session expired after 30 minutes of inactivity. Please sign in again.</span>
          </div>
        ) : null}
        {choosing && mfa ? <div className="auth-form-fields">
          <div className="auth-field">
            <span className="auth-field-label">Two-step verification</span>
            <span className="auth-field-hint">Choose where to send your 8-digit verification code.</span>
          </div>
          <div className="auth-mfa-options">
            {mfa.methods.map((method) => (
              <button key={method} type="button" className="auth-mfa-option" disabled={sendingTo !== null} onClick={() => void sendCode(method)}>
                <span className="auth-mfa-option-icon"><Icon name={method === 'EMAIL' ? 'mail-line' : 'telegram-line'} /></span>
                <span className="auth-mfa-option-text">
                  <strong>{method === 'EMAIL' ? 'Email' : 'Telegram'}</strong>
                  <span>{method === 'EMAIL' ? 'Send the code to your verified email address' : 'Send the code to your linked Telegram chat'}</span>
                </span>
                <Icon name={sendingTo === method ? 'loader-4-line' : 'arrow-right-s-line'} />
              </button>
            ))}
          </div>
        </div> : challenge ? <div className="auth-form-fields">
          <label className="auth-field">
            <span className="auth-field-label">{challenge.method === 'EMAIL' ? 'Email' : 'Telegram'} verification code <b>*</b></span>
            <span className="auth-field-hint">{challenge.method === 'EMAIL' ? `Enter the 8-digit code sent to ${challenge.destination || 'your verified email address'}.` : 'Enter the 8-digit code sent to your linked Telegram chat.'}</span>
            <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="00000000" required className="auth-input" />
          </label>
          {challenge.expiresAt ? <span className="auth-field-hint">Expires at {parseServerTime(challenge.expiresAt).toLocaleTimeString()}.</span> : null}
        </div> : <div className="auth-form-fields">
          <Field label="Username" leadingIcon="user-line" autoComplete="username" value={username} onChange={setUsername} placeholder="e.g. vathana.admin" required />
          <div className="auth-field">
            <div className="auth-field-heading">
              <label htmlFor="password" className="auth-field-label">Password <b>*</b></label>
              <span className="auth-field-hint">Your workspace password</span>
            </div>
            <div className="auth-password-wrap">
              <span className="auth-input-leading-icon"><Icon name="lock-2-line" /></span>
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required className="auth-input auth-input--with-leading-icon" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="auth-password-toggle"><Icon name={showPassword ? 'eye-off-line' : 'eye-line'} /></button>
            </div>
          </div>
        </div>}
        {error ? <p role="alert" className="auth-alert auth-alert--error">{error}</p> : null}
        {!mfa ? <div className="auth-security-note"><span className="auth-security-icon"><Icon name="shield-check-line" /></span><span><strong>Private session.</strong> Your access stays in secure browser cookies — never local storage.</span></div> : null}
        {!choosing ? <Button type="submit" disabled={submitting || isRestoring || Boolean(challenge && mfaCode.length !== 8)} className="auth-submit-button">{submitting ? 'Checking access…' : challenge ? 'Verify and sign in' : 'Open workspace'} <Icon name="arrow-right-line" /></Button> : null}
        {mfa ? <div className="auth-mfa-links">
          {challenge && mfa.selectionToken ? <button type="button" disabled={sendingTo !== null} onClick={() => void sendCode(challenge.method)}>{sendingTo === challenge.method ? 'Sending…' : 'Resend code'}</button> : null}
          {otherMethod && mfa.selectionToken ? <button type="button" disabled={sendingTo !== null} onClick={() => void sendCode(otherMethod)}>{otherMethod === 'EMAIL' ? 'Send to email instead' : 'Send to Telegram instead'}</button> : null}
          <button type="button" onClick={backToPassword}>Back to password</button>
        </div> : null}
      </form>
      <div className="auth-form-footer"><span>New here?</span> <Link to="/register-business">Create your workspace account <Icon name="arrow-up-right-line" /></Link></div>
    </AuthShell>
  )
}

type AuthFieldProps = {
  label: string
  leadingIcon?: string
  value: string
  onChange: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

function Field({ label, leadingIcon = 'user-line', value, onChange, ...props }: AuthFieldProps) {
  return <label className="auth-field"><span className="auth-field-label">{label} <b>*</b></span><span className="auth-input-wrap"><span className="auth-input-leading-icon"><Icon name={leadingIcon} /></span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="auth-input auth-input--with-leading-icon" /></span></label>
}
