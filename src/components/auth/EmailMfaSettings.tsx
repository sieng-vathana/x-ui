import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { useToast } from '../../context/ToastContext'
import { emailMfaApi, type EmailMfaStatus } from '../../features/auth/emailMfaApi'
import { parseServerTime } from '../../lib/serverTime'

export function EmailMfaSettings() {
  const { toast } = useToast()
  const [status, setStatus] = useState<EmailMfaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [challenge, setChallenge] = useState<{ token: string; expiresAt: string; email: string } | null>(null)
  const [code, setCode] = useState('')

  const loadStatus = useCallback(async () => {
    try { setStatus(await emailMfaApi.status()) }
    catch (error) { toast(error instanceof Error ? error.message : 'Email security settings could not be loaded.', 'error') }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { void loadStatus() }, [loadStatus])

  const sendCode = async () => {
    if (!password) { toast('Enter your current password to verify your email.', 'warning'); return }
    try {
      setBusy(true)
      const result = await emailMfaApi.startVerification(password)
      setChallenge({ token: result.challengeToken, expiresAt: result.expiresAt, email: result.maskedEmail })
      setCode('')
      toast(`Verification code sent to ${result.maskedEmail}.`, 'success')
    } catch (error) { toast(error instanceof Error ? error.message : 'The email code could not be sent.', 'error') }
    finally { setBusy(false) }
  }

  const verify = async () => {
    if (!challenge || code.length !== 8) return
    try {
      setBusy(true)
      setStatus(await emailMfaApi.confirmVerification(challenge.token, code))
      setChallenge(null)
      setCode('')
      setPassword('')
      toast('Email verified and email 2FA enabled.', 'success')
    } catch (error) { toast(error instanceof Error ? error.message : 'The email code could not be verified.', 'error') }
    finally { setBusy(false) }
  }

  const setEnabled = async (enabled: boolean) => {
    if (!password) { toast('Enter your current password to change email 2FA.', 'warning'); return }
    try {
      setBusy(true)
      setStatus(await emailMfaApi.setEnabled(enabled, password))
      setPassword('')
      toast(enabled ? 'Email 2FA is enabled.' : 'Email 2FA is disabled.', 'success')
    } catch (error) { toast(error instanceof Error ? error.message : 'Email 2FA could not be updated.', 'error') }
    finally { setBusy(false) }
  }

  const disconnect = async () => {
    if (!password) { toast('Enter your current password to disconnect email 2FA.', 'warning'); return }
    if (!window.confirm('Disconnect email verification? You will need to verify the address again before using email 2FA.')) return
    try {
      setBusy(true)
      setStatus(await emailMfaApi.disconnect(password))
      setPassword('')
      setChallenge(null)
      setCode('')
      toast('Email verification was disconnected.', 'success')
    } catch (error) { toast(error instanceof Error ? error.message : 'Email 2FA could not be disconnected.', 'error') }
    finally { setBusy(false) }
  }

  if (loading) return <p className="m-0 text-sm text-vpos-muted">Loading email security settings…</p>
  if (!status) return <p className="m-0 text-sm text-vpos-muted">Email security settings are temporarily unavailable.</p>

  return <section className="grid gap-4 rounded-xl border border-vpos-line bg-white p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-vpos-sand text-xl text-vpos-primary"><Icon name="mail-line" /></span>
        <div>
          <h3 className="m-0 text-base font-bold text-vpos-text">Email two-step verification</h3>
          <p className="mt-1 mb-0 max-w-2xl text-sm leading-relaxed text-vpos-muted">Use a one-time code sent to your account email after entering your password.</p>
          <p className="mt-2 mb-0 text-xs font-semibold text-vpos-muted">{status.enabled && status.verified ? `Enabled · ${status.maskedEmail}` : status.verified ? `Verified · ${status.maskedEmail} · not enabled` : status.emailAvailable ? `Verify the current account email · ${status.maskedEmail}` : 'Add an email address to your account first'}</p>
        </div>
      </div>
      {status.enabled ? <span className="inline-flex h-9 items-center gap-1 rounded-full bg-vpos-green-bg px-3 text-xs font-bold text-vpos-green"><Icon name="checkbox-circle-line" />Enabled</span> : null}
    </div>

    {!status.mailConfigured ? <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Email verification is not configured on the server yet.</div> : null}

    {(!status.verified || !status.enabled) ? <label className="block text-sm font-semibold text-vpos-text" htmlFor="email-mfa-password">Confirm with your current password
      <input id="email-mfa-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-11 w-full max-w-md rounded-lg border border-vpos-line px-3 text-sm font-normal" />
    </label> : null}

    {!status.verified && !challenge ? <button type="button" disabled={!status.mailConfigured || !status.emailAvailable || busy} onClick={() => void sendCode()} className="min-h-11 w-fit rounded-lg bg-vpos-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Send verification code</button> : null}

    {challenge ? <div className="grid max-w-md gap-3 rounded-lg border border-vpos-line bg-vpos-subtle/40 p-4">
      <p className="m-0 text-sm text-vpos-text">Enter the 8-digit code sent to <strong>{challenge.email}</strong>. It expires at {parseServerTime(challenge.expiresAt).toLocaleTimeString()}.</p>
      <label className="text-sm font-semibold text-vpos-text" htmlFor="email-mfa-code">Email verification code
        <input id="email-mfa-code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} className="mt-2 min-h-11 w-full rounded-lg border border-vpos-line px-3 font-mono text-base tracking-[0.3em]" placeholder="00000000" />
      </label>
      <button type="button" disabled={busy || code.length !== 8} onClick={() => void verify()} className="min-h-11 rounded-lg bg-vpos-primary px-4 text-sm font-bold text-white disabled:opacity-50">Verify email and enable 2FA</button>
    </div> : null}

    {status.verified ? <div className="flex flex-wrap gap-3">
      {status.enabled
        ? <button type="button" disabled={busy} onClick={() => void setEnabled(false)} className="min-h-11 rounded-lg border border-vpos-line px-4 text-sm font-bold text-vpos-text disabled:opacity-50">Disable email 2FA</button>
        : <button type="button" disabled={busy || !status.mailConfigured} onClick={() => void setEnabled(true)} className="min-h-11 rounded-lg bg-vpos-primary px-4 text-sm font-bold text-white disabled:opacity-50">Enable email 2FA</button>}
      <button type="button" disabled={busy} onClick={() => void disconnect()} className="min-h-11 rounded-lg border border-rose-200 px-4 text-sm font-bold text-rose-700 disabled:opacity-50">Disconnect email</button>
    </div> : null}

    {(status.verified || status.enabled) ? <label className="block text-sm font-semibold text-vpos-text" htmlFor="email-mfa-change-password">Password required for changes
      <input id="email-mfa-change-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-11 w-full max-w-md rounded-lg border border-vpos-line px-3 text-sm font-normal" />
    </label> : null}
    <p className="m-0 text-xs leading-relaxed text-vpos-muted">Codes expire after 5 minutes and are limited to 5 attempts. Email 2FA is an alternative to Telegram; if both are enabled, sign-in uses email.</p>
  </section>
}
