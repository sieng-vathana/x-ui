import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import type { TelegramChat, TelegramChatChanges, TelegramPreferences, TelegramStatus } from '../../features/telegram/telegramApi'
import {
  useCreateTelegramLink,
  useDisconnectTelegramChat,
  useSendTelegramTest,
  useTelegramStatus,
  useUpdateTelegramChat,
  useUpdateTelegramPreferences,
} from '../../features/telegram/useTelegram'
import { useStores } from '../../features/stores/useStores'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { Icon } from '../ui/Icon'
import { Select } from '../ui/Select'
import { Toggle } from '../ui/Toggle'
import { parseServerTime } from '../../lib/serverTime'

const HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
}))

type StoreName = { id: number; name: string }

/** Connects Telegram chats to the business and chooses, per chat, which stores and alerts it gets. */
export function TelegramAlertsForm({ businessId, businessName }: { businessId: number; businessName: string }) {
  const { toast } = useToast()
  const [pendingLink, setPendingLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const statusQuery = useTelegramStatus(businessId, Boolean(pendingLink))
  const createLinkMutation = useCreateTelegramLink(businessId)
  const preferencesMutation = useUpdateTelegramPreferences(businessId)
  const { data: storeOptions = [] } = useStores()
  const stores = useMemo<StoreName[]>(() => storeOptions.map((store) => ({ id: Number(store.id), name: store.name })), [storeOptions])
  const status = statusQuery.data

  useEffect(() => {
    if (!pendingLink || status?.linkPending !== false) return
    setPendingLink(null)
    toast('Telegram chat connected.', 'success')
  }, [pendingLink, status?.linkPending, toast])

  useEffect(() => {
    if (!pendingLink) return
    const expiresIn = parseServerTime(pendingLink.expiresAt).getTime() - Date.now()
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

  const savePreferences = async (preferences: TelegramPreferences) => {
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

  const hasGroup = status.chats.some((chat) => chat.chatType !== 'private')

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[22px] ${status.connected ? 'bg-vpos-green-bg text-vpos-green' : 'bg-vpos-sand text-vpos-primary'}`}>
              <Icon name="telegram-line" />
            </span>
            <span>
              <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">Telegram chats</h3>
              <p className="mt-1 mb-0 max-w-2xl text-[13px] leading-5 text-vpos-muted">
                Each chat gets the alerts of the stores you choose. Connect your own Telegram, or a group with your staff; press Start in Telegram to finish.
              </p>
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button onClick={() => void connect('private')} disabled={createLinkMutation.isPending}>
              <Icon name="telegram-line" /> Connect Telegram
            </Button>
            <Button variant="secondary" onClick={() => void connect('group')} disabled={createLinkMutation.isPending}>
              <Icon name="group-line" /> Use a group
            </Button>
          </div>
        </div>
        {pendingLink ? (
          <p aria-live="polite" className="mt-4 mb-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-vpos-primary/15 bg-vpos-sand/60 px-3 py-2.5 text-[13px] text-vpos-primary-2">
            <Icon name="loader-4-line" className="animate-spin" /> Waiting for Start in Telegram. This page updates when the chat connects.
            <a href={pendingLink.url} target="_blank" rel="noreferrer" className="font-bold underline">Open Telegram again</a>
          </p>
        ) : null}

        {status.chats.length ? (
          <ul className="mt-5 mb-0 list-none space-y-3 p-0">
            {status.chats.map((chat) => <ChatCard key={chat.id} businessId={businessId} businessName={businessName} chat={chat} stores={stores} lowStockThreshold={status.lowStockThreshold} />)}
          </ul>
        ) : (
          <p className="mt-5 mb-0 rounded-xl border border-dashed border-vpos-line px-4 py-6 text-center text-[13px] text-vpos-muted">
            No chat is connected yet.
          </p>
        )}
        {hasGroup && status.botUsername ? (
          <p className="mt-3 mb-0 text-[12px] leading-5 text-vpos-muted">
            {`Group with topics? Open the topic that should get alerts and send /here@${status.botUsername} there.`}
          </p>
        ) : null}
      </section>

      {status.chats.length ? <SharedSettings status={status} onSave={(preferences) => void savePreferences(preferences)} /> : null}
    </div>
  )
}

function ChatCard({ businessId, businessName, chat, stores, lowStockThreshold }: { businessId: number; businessName: string; chat: TelegramChat; stores: StoreName[]; lowStockThreshold: number }) {
  const { toast } = useToast()
  const [editingStores, setEditingStores] = useState(false)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)
  const updateMutation = useUpdateTelegramChat(businessId)
  const disconnectMutation = useDisconnectTelegramChat(businessId)
  const testMutation = useSendTelegramTest(businessId)
  const title = chat.chatTitle || 'Telegram chat'
  const storeNames = chat.allStores
    ? null
    : chat.storeIds.map((id) => stores.find((store) => store.id === id)?.name ?? `Store #${id}`).join(', ')
  const previewStoreName = chat.allStores
    ? stores[0]?.name ?? 'Example store'
    : chat.storeIds.map((id) => stores.find((store) => store.id === id)?.name).find(Boolean) ?? 'Example store'

  const update = async (changes: TelegramChatChanges) => {
    try {
      await updateMutation.mutateAsync({ chatId: chat.id, changes })
      return true
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The Telegram chat could not be saved.', 'error')
      return false
    }
  }

  const sendTest = async () => {
    try {
      await testMutation.mutateAsync(chat.id)
      toast('Test alert sent. Check your Telegram.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The test alert could not be sent.', 'error')
    }
  }

  const disconnect = async () => {
    try {
      await disconnectMutation.mutateAsync(chat.id)
      setConfirmingDisconnect(false)
      toast(`${title} disconnected.`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The Telegram chat could not be disconnected.', 'error')
    }
  }

  return (
    <li className="rounded-xl border border-vpos-line p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-vpos-green-bg text-[19px] text-vpos-green">
            <Icon name={chat.chatType === 'private' ? 'user-line' : 'group-line'} />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[14px] text-vpos-text">{title}</strong>
            <span className="block text-[12px] text-vpos-muted">{placeLabel(chat)}</span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-vpos-text">
              <Icon name="store-2-line" className="text-vpos-muted" />
              {storeNames === null ? <span>All stores</span> : <span>{storeNames}</span>}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void sendTest()} disabled={testMutation.isPending}>
            <Icon name={testMutation.isPending ? 'loader-4-line' : 'send-plane-line'} className={testMutation.isPending ? 'animate-spin' : ''} /> Send test
          </Button>
          <Button variant="secondary" onClick={() => setEditingStores((open) => !open)}>
            <Icon name="store-2-line" /> Change stores
          </Button>
          <Button variant="secondary" onClick={() => setConfirmingDisconnect(true)}>
            <Icon name="link-unlink" /> Disconnect
          </Button>
        </div>
      </div>

      {editingStores ? (
        <StorePicker
          chat={chat}
          stores={stores}
          saving={updateMutation.isPending}
          onCancel={() => setEditingStores(false)}
          onSave={async (changes) => { if (await update(changes)) setEditingStores(false) }}
        />
      ) : null}

      <div className="mt-3 grid gap-x-6 border-t border-vpos-line/70 pt-1 sm:grid-cols-2">
        <Toggle label="KHQR payments" description="When a customer's KHQR payment arrives in your Bakong account." checked={chat.khqrAlerts} onChange={(khqrAlerts) => void update({ khqrAlerts })} className="py-2.5" />
        <Toggle label="Online orders" description="When a customer places an order in your online store." checked={chat.orderAlerts} onChange={(orderAlerts) => void update({ orderAlerts })} className="py-2.5" />
        <Toggle label="Low stock" description="When a sale leaves a product at or below the low stock level." checked={chat.lowStockAlerts} onChange={(lowStockAlerts) => void update({ lowStockAlerts })} className="py-2.5" />
        <Toggle label="Sales summaries" description="Sales by store and payment method every day, last week's on Mondays and last month's on the 1st." checked={chat.dailySummary} onChange={(dailySummary) => void update({ dailySummary })} className="py-2.5" />
      </div>

      <TelegramMessagePreview
        businessName={businessName}
        chat={chat}
        storeName={previewStoreName}
        lowStockThreshold={lowStockThreshold}
      />

      <ConfirmModal
        open={confirmingDisconnect}
        onClose={() => setConfirmingDisconnect(false)}
        onConfirm={disconnect}
        title="Disconnect this chat?"
        description="This chat will stop getting alerts. You can connect it again later."
        confirmText="Disconnect"
        variant="danger"
        isLoading={disconnectMutation.isPending}
      />
    </li>
  )
}

type PreviewKind = 'khqr' | 'order' | 'stock' | 'summary'

const PREVIEW_LABELS: Record<PreviewKind, string> = {
  khqr: 'KHQR payments',
  order: 'Online orders',
  stock: 'Low stock',
  summary: 'Sales summaries',
}

function TelegramMessagePreview({ businessName, chat, storeName, lowStockThreshold }: {
  businessName: string
  chat: TelegramChat
  storeName: string
  lowStockThreshold: number
}) {
  const available: PreviewKind[] = []
  if (chat.khqrAlerts) available.push('khqr')
  if (chat.orderAlerts) available.push('order')
  if (chat.lowStockAlerts) available.push('stock')
  if (chat.dailySummary) available.push('summary')
  const [selected, setSelected] = useState<PreviewKind>('khqr')
  const active = available.includes(selected) ? selected : available[0]
  const message = active ? previewMessage(active, businessName, storeName, lowStockThreshold) : ''

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-vpos-line" aria-label="Telegram message preview">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vpos-line bg-vpos-subtle/50 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#229ED9] text-[17px] text-white"><Icon name="telegram-line" /></span>
          <div>
            <h4 className="m-0 text-[13px] font-bold text-vpos-text">Message preview</h4>
            <p className="m-0 text-[11px] text-vpos-muted">Example only · no message is sent</p>
          </div>
        </div>
        <span className="max-w-full truncate text-[12px] font-semibold text-vpos-muted">{chat.chatTitle || 'Telegram chat'}</span>
      </div>

      {available.length ? (
        <>
          <div className="flex gap-1.5 overflow-x-auto border-b border-vpos-line bg-vpos-surface px-3 py-2" role="tablist" aria-label="Preview alert type">
            {available.map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={active === kind}
                onClick={() => setSelected(kind)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${active === kind ? 'bg-vpos-primary text-white' : 'bg-vpos-subtle text-vpos-muted hover:text-vpos-text'}`}
              >
                {PREVIEW_LABELS[kind]}
              </button>
            ))}
          </div>
          <div className="bg-[#0e1621] p-3.5 sm:p-4">
            <div className="ml-auto max-w-[560px] rounded-2xl rounded-tl-sm bg-[#182533] px-3.5 py-3 text-[13px] leading-5 text-[#f2f5f8] shadow-sm">
              <div className="whitespace-pre-line break-words" data-locale-ignore="true">{message}</div>
              <div className="mt-1 text-right text-[10px] leading-4 text-[#91a0ad]">9:41 PM</div>
            </div>
          </div>
        </>
      ) : (
        <p className="m-0 bg-vpos-surface px-4 py-5 text-[12px] text-vpos-muted">Turn on an alert above to preview its Telegram message.</p>
      )}
    </section>
  )
}

function previewMessage(kind: PreviewKind, businessName: string, storeName: string, lowStockThreshold: number) {
  switch (kind) {
    case 'khqr':
      return '💰 KHQR payment received\n$12.50\n👤 Customer: Dara Sok\nOrder ORD-1042'
    case 'order':
      return '🛒 New online order ORD-1042\n$24.50 · 2 items\n• Iced latte x1\n• Croissant x1\n👤 Customer: Dara Sok\nDeliver to: Dara Sok · 012 345 678 · Phnom Penh'
    case 'stock':
      return `⚠️ Low stock after order ORD-1042\n• Iced latte: ${Math.max(0, lowStockThreshold - 1)} left`
    case 'summary':
      return `📊 Daily summary · ${businessName || 'Your business'}\n${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(',', '')}\n\n${storeName}\n• Sales: $142.50 from 8 payments\n• Cash $55.00 · KHQR $87.50\n\nTotal after refunds: $142.50`
  }
}

function StorePicker({ chat, stores, saving, onCancel, onSave }: {
  chat: TelegramChat
  stores: StoreName[]
  saving: boolean
  onCancel: () => void
  onSave: (changes: TelegramChatChanges) => Promise<void>
}) {
  const [allStores, setAllStores] = useState(chat.allStores)
  const [chosen, setChosen] = useState<number[]>(chat.allStores ? [] : chat.storeIds)
  const invalid = !allStores && chosen.length === 0

  return (
    <fieldset className="mt-3 rounded-xl border border-vpos-line bg-vpos-subtle p-3">
      <legend className="px-1 text-[12px] font-bold text-vpos-dark">Stores for this chat</legend>
      <div className="flex flex-wrap gap-4 text-[13px] text-vpos-text">
        <label className="flex items-center gap-2">
          <input type="radio" checked={allStores} onChange={() => setAllStores(true)} className="h-4 w-4 accent-vpos-primary" /> All stores
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={!allStores} onChange={() => setAllStores(false)} className="h-4 w-4 accent-vpos-primary" /> Only these stores
        </label>
      </div>
      {!allStores ? (
        <div className="mt-3 grid max-h-52 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {stores.map((store) => {
            const checked = chosen.includes(store.id)
            return (
              <label key={store.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-vpos-line bg-white px-3.5 py-2.5 text-[13px] font-semibold text-vpos-text">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setChosen((current) => (checked ? current.filter((id) => id !== store.id) : [...current, store.id]))}
                  className="h-4 w-4 accent-vpos-primary"
                />
                <span className="min-w-0 truncate">{store.name}</span>
              </label>
            )
          })}
        </div>
      ) : null}
      {invalid ? <p className="mt-2 mb-0 text-[12px] text-vpos-red">Choose at least one store.</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
         
          disabled={saving || invalid}
          onClick={() => void onSave(allStores ? { allStores: true } : { allStores: false, storeIds: chosen })}
        >
          <Icon name="save-line" /> Save stores
        </Button>
      </div>
    </fieldset>
  )
}

function SharedSettings({ status, onSave }: { status: TelegramStatus; onSave: (preferences: TelegramPreferences) => void }) {
  return (
    <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
      <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">Alert settings</h3>
      <p className="mt-1 mb-3 text-[13px] leading-5 text-vpos-muted">Shared by all chats. Changes save straight away.</p>
      <div className="flex flex-wrap gap-5">
        <LowStockLevel status={status} onSave={(lowStockThreshold) => onSave({ lowStockThreshold })} />
        <div className="w-[220px]">
          <Select label="Send summaries at" value={String(status.dailySummaryHour)} options={HOURS} onChange={(value) => onSave({ dailySummaryHour: Number(value) })} />
        </div>
      </div>
    </section>
  )
}

/** Where in Telegram the alerts arrive: a private chat, a group, or one topic of a group with topics. */
function placeLabel(chat: TelegramChat) {
  if (chat.chatType === 'private') return 'Private chat'
  if (chat.inTopic) return chat.topicTitle ? `Group · topic “${chat.topicTitle}”` : 'Group · one topic'
  return chat.topicTitle ? `Group · topic “${chat.topicTitle}”` : 'Group'
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
    <label className="block w-[220px]">
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
