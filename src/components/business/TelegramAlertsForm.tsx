import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import type { TelegramPreferences, TelegramStatus } from '../../features/telegram/telegramApi'
import {
  useCreateTelegramLink,
  useDisconnectTelegram,
  useSendTelegramTest,
  useTelegramStatus,
  useUpdateTelegramPreferences,
} from '../../features/telegram/useTelegram'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Select } from '../ui/Select'
import { Toggle } from '../ui/Toggle'

const HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
}))

/** Connects the business to a Telegram chat and chooses which alerts it receives. */
export function TelegramAlertsForm({ businessId }: { businessId: number }) {
  const { toast } = useToast()
  const [pendingLink, setPendingLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const statusQuery = useTelegramStatus(businessId, Boolean(pendingLink))
  const createLinkMutation = useCreateTelegramLink(businessId)
  const disconnectMutation = useDisconnectTelegram(businessId)
  const testMutation = useSendTelegramTest(businessId)
  const preferencesMutation = useUpdateTelegramPreferences(businessId)
  const status = statusQuery.data

  useEffect(() => {
    if (!pendingLink || !status?.connected) return
    setPendingLink(null)
    toast(`Telegram connected to ${status.chatTitle || 'your chat'}.`, 'success')
  }, [pendingLink, status?.connected, status?.chatTitle, toast])

  useEffect(() => {
    if (!pendingLink) return
    const expiresIn = new Date(pendingLink.expiresAt).getTime() - Date.now()
    const timer = window.setTimeout(() => setPendingLink(null), Math.max(0, expiresIn))
    return () => window.clearTimeout(timer)
  }, [pendingLink])

  const connect = async (target: 'private' | 'group') => {
    // Opened during the click so the browser does not block it; it is pointed at Telegram once the link is ready.
    const telegramWindow = window.open('', '_blank')
    if (telegramWindow) telegramWindow.opener = null
    try {
      const link = await createLinkMutation.mutateAsync()
      const url = target === 'group' ? link.groupChatUrl : link.privateChatUrl
      if (telegramWindow) telegramWindow.location.href = url
      setPendingLink({ url, expiresAt: link.expiresAt })
    } catch (error) {
      telegramWindow?.close()
      toast(error instanceof Error ? error.message : 'The Telegram link could not be created.', 'error')
    }
  }

  const disconnect = async () => {
    try {
      await disconnectMutation.mutateAsync()
      toast('Telegram disconnected. No more alerts will be sent.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Telegram could not be disconnected.', 'error')
    }
  }

  const sendTest = async () => {
    try {
      await testMutation.mutateAsync()
      toast('Test alert sent. Check your Telegram.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The test alert could not be sent.', 'error')
    }
  }

  const save = async (preferences: TelegramPreferences) => {
    try {
      await preferencesMutation.mutateAsync(preferences)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Telegram alerts could not be saved.', 'error')
    }
  }

  if (statusQuery.isLoading) {
    return <p className="m-0 text-[13px] text-vpos-muted">Loading Telegram alerts…</p>
  }
  if (statusQuery.isError || !status) {
    return (
      <p className="m-0 rounded-lg border border-vpos-red/25 bg-vpos-red-bg px-3 py-2.5 text-[13px] text-vpos-red">
        {statusQuery.error instanceof Error ? statusQuery.error.message : 'Telegram alerts could not be loaded.'}
      </p>
    )
  }
  if (!status.botConfigured) {
    return (
      <p className="m-0 flex items-start gap-2 rounded-lg border border-vpos-orange/25 bg-vpos-orange-bg px-3 py-2.5 text-[13px] leading-5 text-vpos-orange">
        <Icon name="information-line" className="mt-0.5 shrink-0 text-[16px]" />
        Telegram alerts are not set up on this server yet. The platform administrator needs to add the Telegram bot token.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[22px] ${status.connected ? 'bg-vpos-green-bg text-vpos-green' : 'bg-vpos-sand text-vpos-primary'}`}>
              <Icon name="telegram-line" />
            </span>
            <span>
              <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">
                {status.connected ? `Connected to ${status.chatTitle || 'your Telegram chat'}` : 'Telegram is not connected'}
              </h3>
              <p className="mt-1 mb-0 max-w-2xl text-[13px] leading-5 text-vpos-muted">
                {status.connected
                  ? 'Alerts you switch on below arrive in this chat.'
                  : 'Connect your own Telegram, or a group with your staff. Telegram opens the bot; press Start to finish.'}
              </p>
            </span>
          </div>
          {status.connected ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void sendTest()} disabled={testMutation.isPending}>
                <Icon name={testMutation.isPending ? 'loader-4-line' : 'send-plane-line'} className={testMutation.isPending ? 'animate-spin' : ''} /> Send test alert
              </Button>
              <Button variant="secondary" onClick={() => void disconnect()} disabled={disconnectMutation.isPending}>
                <Icon name="link-unlink" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button onClick={() => void connect('private')} disabled={createLinkMutation.isPending}>
                <Icon name="telegram-line" /> Connect Telegram
              </Button>
              <Button variant="secondary" onClick={() => void connect('group')} disabled={createLinkMutation.isPending}>
                <Icon name="group-line" /> Use a group
              </Button>
            </div>
          )}
        </div>
        {pendingLink && !status.connected ? (
          <p aria-live="polite" className="mt-4 mb-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-vpos-primary/15 bg-vpos-sand/60 px-3 py-2.5 text-[13px] text-vpos-primary-2">
            <Icon name="loader-4-line" className="animate-spin" /> Waiting for Start in Telegram. This page updates when the chat connects.
            <a href={pendingLink.url} target="_blank" rel="noreferrer" className="font-bold underline">Open Telegram again</a>
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
        <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">Alerts</h3>
        <p className="mt-1 mb-2 text-[13px] leading-5 text-vpos-muted">Changes save straight away.</p>
        <div className="divide-y divide-vpos-line/70">
          <AlertToggle label="KHQR payments" description="When a customer's KHQR payment arrives in your Bakong account." checked={status.khqrAlerts} onChange={(khqrAlerts) => void save({ khqrAlerts })} />
          <AlertToggle label="Online orders" description="When a customer places an order in your online store." checked={status.orderAlerts} onChange={(orderAlerts) => void save({ orderAlerts })} />
          <div>
            <AlertToggle label="Low stock" description="When a sale leaves a product at or below the low stock level." checked={status.lowStockAlerts} onChange={(lowStockAlerts) => void save({ lowStockAlerts })} />
            {status.lowStockAlerts ? <LowStockLevel status={status} onSave={(lowStockThreshold) => void save({ lowStockThreshold })} /> : null}
          </div>
          <div>
            <AlertToggle label="Daily summary" description="Sales by store and payment method, once a day." checked={status.dailySummary} onChange={(dailySummary) => void save({ dailySummary })} />
            {status.dailySummary ? (
              <div className="max-w-[220px] pb-3">
                <Select label="Send at" value={String(status.dailySummaryHour)} options={HOURS} onChange={(value) => void save({ dailySummaryHour: Number(value) })} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

function AlertToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <Toggle label={label} description={description} checked={checked} onChange={onChange} className="py-3.5" />
}

function LowStockLevel({ status, onSave }: { status: TelegramStatus; onSave: (threshold: number) => void }) {
  const [value, setValue] = useState(String(status.lowStockThreshold))
  useEffect(() => setValue(String(status.lowStockThreshold)), [status.lowStockThreshold])
  const commit = () => {
    const threshold = Number(value)
    if (!Number.isInteger(threshold) || threshold < 0) {
      setValue(String(status.lowStockThreshold))
      return
    }
    if (threshold !== status.lowStockThreshold) onSave(threshold)
  }
  return (
    <label className="block max-w-[220px] pb-3">
      <span className="mb-2 block text-[12px] font-semibold tracking-[.02em] text-vpos-dark">Low stock level (units)</span>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
        className="h-[39px] w-full rounded-[4px] border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none focus:border-vpos-primary"
      />
    </label>
  )
}
