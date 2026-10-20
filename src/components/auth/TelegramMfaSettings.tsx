import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { useToast } from '../../context/ToastContext'
import { telegramMfaApi, type TelegramMfaStatus } from '../../features/auth/telegramMfaApi'
import { REALTIME_RECONNECTED, useRealtimeEvent } from '../../lib/realtime'

export function TelegramMfaSettings() {
  const { toast } = useToast()
  const [status, setStatus] = useState<TelegramMfaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const loadStatus = useCallback(async () => {
    try { setStatus(await telegramMfaApi.status()) }
    catch (error) { toast(error instanceof Error ? error.message : 'Security settings could not be loaded.', 'error') }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { void loadStatus() }, [loadStatus])
  // Pressing Start in Telegram links the account; the user service pushes that, so the page updates at once.
  useRealtimeEvent(['telegram.mfa.linked', REALTIME_RECONNECTED], () => { void loadStatus() })
  useEffect(() => {
    if (!linkUrl) return
    const timer = window.setTimeout(() => setLinkUrl(''), 10 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [linkUrl])

  const connect = async () => {
    let popup: Window | null = null
    try {
      popup = window.open('', '_blank')
      if (popup) popup.opener = null
      setBusy(true)
      const link = await telegramMfaApi.createLink()
      setLinkUrl(link.url)
      if (popup) popup.location.href = link.url
      toast('Open Telegram and press Start to link your account.', 'success')
    } catch (error) {
      popup?.close()
      toast(error instanceof Error ? error.message : 'A Telegram connection link could not be created.', 'error')
    } finally { setBusy(false) }
  }

  const setEnabled = async (enabled: boolean) => {
    if (!password) { toast('Enter your current password to change 2FA.', 'warning'); return }
    try {
      setBusy(true)
      setStatus(await telegramMfaApi.setEnabled(enabled, password))
      setPassword('')
      toast(enabled ? 'Telegram 2FA is enabled.' : 'Telegram 2FA is disabled.', 'success')
    } catch (error) { toast(error instanceof Error ? error.message : 'Telegram 2FA could not be updated.', 'error') }
    finally { setBusy(false) }
  }

  const disconnect = async () => {
    if (!password) { toast('Enter your current password to disconnect Telegram.', 'warning'); return }
    if (!window.confirm('Disconnect Telegram? This will also turn off Telegram 2FA for your account.')) return
    try {
      setBusy(true)
      setStatus(await telegramMfaApi.disconnect(password))
      setPassword('')
      setLinkUrl('')
      toast('Telegram was disconnected.', 'success')
    } catch (error) { toast(error instanceof Error ? error.message : 'Telegram could not be disconnected.', 'error') }
    finally { setBusy(false) }
  }

  if (loading) return <p className="m-0 text-sm text-vpos-muted">Loading account security…</p>
  if (!status) return <p className="m-0 text-sm text-vpos-muted">Account security is temporarily unavailable.</p>

  return <div className="grid gap-5">
    <div className="flex flex-col gap-4 rounded-xl border border-vpos-line bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e8f7fc] text-xl text-[#229ed9]"><Icon name="telegram-line" /></span>
        <div>
          <h3 className="m-0 text-base font-bold text-vpos-text">Telegram two-step verification</h3>
          <p className="mt-1 mb-0 max-w-2xl text-sm leading-relaxed text-vpos-muted">When enabled, sign-in needs your password and a one-time code sent to your private Telegram chat.</p>
          <p className="mt-2 mb-0 text-xs font-semibold text-vpos-muted">{status.enabled ? 'Enabled' : status.connected ? 'Connected · not enabled' : 'Not connected'}</p>
        </div>
      </div>
      {!status.connected ? <button type="button" disabled={!status.botConfigured || busy} onClick={() => void connect()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-vpos-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Icon name="shield-check-line" />Connect Telegram</button> : null}
    </div>

    {!status.botConfigured ? <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">The dedicated Telegram security bot is not configured on the server yet.</div> : null}
    {status.linkPending ? <div role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">Waiting for you to press <strong>Start</strong> in Telegram…</div> : null}
    {linkUrl && !status.connected ? <a className="text-sm font-semibold text-vpos-primary underline" href={linkUrl} target="_blank" rel="noreferrer">Open the Telegram bot again</a> : null}

    {status.connected ? <section className="rounded-xl border border-vpos-line bg-white p-5">
      <label className="block text-sm font-semibold text-vpos-text" htmlFor="telegram-mfa-password">Confirm with your current password</label>
      <input id="telegram-mfa-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-11 w-full max-w-md rounded-lg border border-vpos-line px-3 text-sm" />
      <div className="mt-4 flex flex-wrap gap-3">
        {status.enabled
          ? <button type="button" disabled={busy} onClick={() => void setEnabled(false)} className="min-h-11 rounded-lg border border-vpos-line px-4 text-sm font-bold text-vpos-text disabled:opacity-50">Disable 2FA</button>
          : <button type="button" disabled={busy} onClick={() => void setEnabled(true)} className="min-h-11 rounded-lg bg-vpos-primary px-4 text-sm font-bold text-white disabled:opacity-50">Enable Telegram 2FA</button>}
        <button type="button" disabled={busy} onClick={() => void disconnect()} className="min-h-11 rounded-lg border border-rose-200 px-4 text-sm font-bold text-rose-700 disabled:opacity-50">Disconnect Telegram</button>
      </div>
      <p className="mt-3 mb-0 text-xs leading-relaxed text-vpos-muted">Turning off 2FA or disconnecting requires your password. Disconnecting also disables Telegram sign-in verification.</p>
    </section> : null}
  </div>
}
