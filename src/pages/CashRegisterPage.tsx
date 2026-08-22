import { useState, type FormEvent } from 'react'
import {
  Breadcrumb,
  Button,
  ConfirmModal,
  FormField,
  Icon,
  SelectField,
  Status,
  StoreSwitcher,
  TextAreaField,
  Topbar,
} from '../components'
import { SalesSubnav } from '../components/sales/SalesSubnav'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePosSettings } from '../features/pos/posSettings'
import type { CashMovementType, CashSession } from '../features/payments/types'
import {
  useAddCashMovement,
  useCloseCashSession,
  useCurrentCashSession,
  useCashSessionHistory,
  useOpenCashSession,
} from '../features/payments/usePayments'
import { useAdminStore } from '../hooks/useAdminStore'
import { formatCurrency } from '../lib/currency'
import { formatReportDate } from '../lib/reporting'
import { paths } from '../lib/paths'
import { card, pageContent } from '../lib/ui'

export function CashRegisterPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { storeId, setStoreId } = useAdminStore()
  const { settings } = usePosSettings(user?.business.id)
  const businessCurrency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()
  const currency = settings.defaultCurrencyCode === 'BUSINESS'
    ? businessCurrency
    : settings.defaultCurrencyCode
  const cashierId = Number(user?.id)
  const storeNumber = Number(storeId)
  const businessId = Number(user?.business.id)
  const canLoadRegister = Boolean(user && Number.isInteger(storeNumber) && storeNumber > 0 && Number.isInteger(cashierId) && cashierId > 0)

  const currentQuery = useCurrentCashSession(storeId, cashierId, currency, canLoadRegister)
  const historyQuery = useCashSessionHistory(storeId, cashierId, currency, canLoadRegister)
  const openMutation = useOpenCashSession()
  const movementMutation = useAddCashMovement()
  const closeMutation = useCloseCashSession()

  const [openingFloat, setOpeningFloat] = useState('')
  const [openingNote, setOpeningNote] = useState('')
  const [movementType, setMovementType] = useState<CashMovementType>('PAY_IN')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [closeNote, setCloseNote] = useState('')
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)

  const current = currentQuery.data ?? null
  const history = historyQuery.data ?? []

  const openRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = parseAmount(openingFloat)
    if (!businessId || !storeNumber || !cashierId) {
      toast('Select a store before opening the cash register.', 'warning')
      return
    }
    if (amount == null || amount < 0) {
      toast('Enter a valid opening float.', 'warning')
      return
    }

    try {
      await openMutation.mutateAsync({
        businessId,
        storeId: storeNumber,
        cashierId,
        currencyCode: currency,
        openingFloat: amount,
        note: openingNote.trim() || undefined,
      })
      setOpeningFloat('')
      setOpeningNote('')
      toast(`Cash register opened in ${currency}.`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The cash register could not be opened.', 'error')
    }
  }

  const addMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = parseAmount(movementAmount)
    if (!current) return
    if (amount == null || amount <= 0) {
      toast('Enter a cash movement amount greater than zero.', 'warning')
      return
    }
    if (!movementReason.trim()) {
      toast('Add a reason for this cash movement.', 'warning')
      return
    }

    try {
      await movementMutation.mutateAsync({
        id: current.id,
        input: {
          type: movementType,
          amount,
          reason: movementReason.trim(),
          createdBy: cashierId,
        },
      })
      setMovementAmount('')
      setMovementReason('')
      toast(movementType === 'PAY_IN' ? 'Cash paid in recorded.' : 'Cash paid out recorded.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The cash movement could not be recorded.', 'error')
    }
  }

  const requestClose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = parseAmount(countedCash)
    if (!current) return
    if (amount == null || amount < 0) {
      toast('Enter the cash counted in the drawer.', 'warning')
      return
    }
    setCloseConfirmOpen(true)
  }

  const closeRegister = async () => {
    if (!current) return
    const amount = parseAmount(countedCash)
    if (amount == null || amount < 0) return
    try {
      await closeMutation.mutateAsync({
        id: current.id,
        input: {
          countedCash: amount,
          closedBy: cashierId,
          closeNote: closeNote.trim() || undefined,
        },
      })
      setCloseConfirmOpen(false)
      setCountedCash('')
      setCloseNote('')
      toast('Cash register closed and reconciled.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The cash register could not be closed.', 'error')
    }
  }

  const refresh = () => {
    void Promise.all([currentQuery.refetch(), historyQuery.refetch()])
  }

  return (
    <>
      <Topbar
        title="Cash register"
        subtitle={`Open, reconcile, and close your ${currency} drawer`}
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb items={[{ label: 'Sales', to: paths.sales }, { label: 'Cash register' }]} />
          <Button variant="secondary" onClick={refresh} disabled={currentQuery.isFetching || historyQuery.isFetching}>
            <Icon name={currentQuery.isFetching || historyQuery.isFetching ? 'loader-4-line' : 'refresh-line'} className={currentQuery.isFetching || historyQuery.isFetching ? 'animate-spin' : ''} />
            Refresh register
          </Button>
        </section>

        <SalesSubnav />

        {currentQuery.isError || historyQuery.isError ? (
          <div className="mt-4 rounded-[4px] border border-vpos-red/25 bg-vpos-red-bg p-4 text-[13px] text-vpos-red">
            {(currentQuery.error || historyQuery.error) instanceof Error
              ? (currentQuery.error || historyQuery.error)?.message
              : 'The cash register could not be loaded.'}
          </div>
        ) : null}

        {!current ? (
          <OpenRegisterCard
            currency={currency}
            openingFloat={openingFloat}
            openingNote={openingNote}
            onOpeningFloatChange={setOpeningFloat}
            onOpeningNoteChange={setOpeningNote}
            onSubmit={openRegister}
            isLoading={openMutation.isPending || currentQuery.isLoading}
          />
        ) : (
          <OpenSessionView
            current={current}
            currency={currency}
            movementType={movementType}
            movementAmount={movementAmount}
            movementReason={movementReason}
            countedCash={countedCash}
            closeNote={closeNote}
            onMovementTypeChange={setMovementType}
            onMovementAmountChange={setMovementAmount}
            onMovementReasonChange={setMovementReason}
            onCountedCashChange={setCountedCash}
            onCloseNoteChange={setCloseNote}
            onMovementSubmit={addMovement}
            onCloseSubmit={requestClose}
            movementLoading={movementMutation.isPending}
            closeLoading={closeMutation.isPending}
          />
        )}

        <HistoryCard history={history} currency={currency} isLoading={historyQuery.isLoading} />
      </main>

      <ConfirmModal
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={closeRegister}
        title="Close cash register?"
        description={closeDescription(current, countedCash, currency)}
        confirmText="Close and reconcile"
        variant="warning"
        icon="lock-line"
        isLoading={closeMutation.isPending}
      />
    </>
  )
}

function OpenRegisterCard({
  currency,
  openingFloat,
  openingNote,
  onOpeningFloatChange,
  onOpeningNoteChange,
  onSubmit,
  isLoading,
}: {
  currency: string
  openingFloat: string
  openingNote: string
  onOpeningFloatChange: (value: string) => void
  onOpeningNoteChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}) {
  return (
    <section className={`${card} mt-[18px] overflow-hidden`}>
      <div className="border-b border-vpos-line bg-vpos-subtle/45 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-vpos-sand text-[22px] text-vpos-primary"><Icon name="safe-2-line" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-[17px] font-extrabold text-vpos-text">Open today’s register</h2><Status value="Ready" className="min-w-0 bg-vpos-green-bg text-vpos-green" /></div>
            <p className="mt-1 mb-0 max-w-[720px] text-[13px] leading-6 text-vpos-muted">Count the cash already in the drawer before taking sales. Cash payments made after opening will be added to the expected balance automatically.</p>
          </div>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <FormField
          label={`Opening float (${currency})`}
          requiredMark
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={openingFloat}
          onChange={(event) => onOpeningFloatChange(event.target.value)}
          placeholder="0.00"
        />
        <TextAreaField
          label="Opening note"
          showToolbar={false}
          rows={2}
          value={openingNote}
          onChange={(event) => onOpeningNoteChange(event.target.value)}
          placeholder="Optional handover or drawer note"
          className="sm:row-span-2"
        />
        <div className="flex items-end">
          <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
            <Icon name={isLoading ? 'loader-4-line' : 'lock-unlock-line'} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Opening…' : 'Open cash register'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function OpenSessionView({
  current,
  currency,
  movementType,
  movementAmount,
  movementReason,
  countedCash,
  closeNote,
  onMovementTypeChange,
  onMovementAmountChange,
  onMovementReasonChange,
  onCountedCashChange,
  onCloseNoteChange,
  onMovementSubmit,
  onCloseSubmit,
  movementLoading,
  closeLoading,
}: {
  current: CashSession
  currency: string
  movementType: CashMovementType
  movementAmount: string
  movementReason: string
  countedCash: string
  closeNote: string
  onMovementTypeChange: (value: CashMovementType) => void
  onMovementAmountChange: (value: string) => void
  onMovementReasonChange: (value: string) => void
  onCountedCashChange: (value: string) => void
  onCloseNoteChange: (value: string) => void
  onMovementSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCloseSubmit: (event: FormEvent<HTMLFormElement>) => void
  movementLoading: boolean
  closeLoading: boolean
}) {
  const netMovements = Number(current.cashIn || 0) - Number(current.cashOut || 0)
  return (
    <>
      <section className="mt-[18px] flex flex-col gap-3 rounded-[4px] border border-vpos-green/25 bg-vpos-green-bg/55 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[20px] text-vpos-green"><Icon name="checkbox-circle-line" /></span><span><strong className="block text-[14px] text-vpos-text">Register is open</strong><span className="mt-0.5 block text-[12px] text-vpos-muted">Opened {formatReportDate(current.openedAt)} · Session #{current.id}</span></span></div>
        <Status value="Open" className="min-w-0 bg-vpos-green-bg text-vpos-green" />
      </section>

      <section className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="Opening float" value={formatCurrency(current.openingFloat, currency)} icon="cash-line" />
        <SummaryTile label="Cash sales" value={formatCurrency(current.cashSales, currency)} detail={`${current.paymentCount} payment${current.paymentCount === 1 ? '' : 's'}`} icon="shopping-bag-3-line" tone="positive" />
        <SummaryTile label="Cash in" value={formatCurrency(current.cashIn, currency)} detail="Paid in" icon="arrow-down-circle-line" tone="positive" />
        <SummaryTile label="Cash out" value={formatCurrency(current.cashOut, currency)} detail="Paid out" icon="arrow-up-circle-line" tone="warning" />
        <SummaryTile label="Expected cash" value={formatCurrency(current.expectedCash, currency)} detail={netMovements >= 0 ? 'Ready to reconcile' : 'After movements'} icon="funds-line" tone="primary" />
      </section>

      <section className="mt-[18px] grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_minmax(340px,.7fr)]">
        <form onSubmit={onMovementSubmit} className={`${card} p-5`}>
          <SectionHeading icon="exchange-funds-line" title="Cash movement" description="Record cash added to or removed from the drawer outside a sale." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Movement type"
              value={movementType}
              onChange={(event) => onMovementTypeChange(event.target.value as CashMovementType)}
              options={[{ value: 'PAY_IN', label: 'Pay in · add cash' }, { value: 'PAY_OUT', label: 'Pay out · remove cash' }]}
            />
            <FormField
              label={`Amount (${currency})`}
              requiredMark
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={movementAmount}
              onChange={(event) => onMovementAmountChange(event.target.value)}
              placeholder="0.00"
            />
            <FormField
              label="Reason"
              requiredMark
              value={movementReason}
              onChange={(event) => onMovementReasonChange(event.target.value)}
              placeholder="Example: petty cash top-up"
              className="sm:col-span-2"
            />
          </div>
          <Button type="submit" variant="secondary" className="mt-5" disabled={movementLoading}>
            <Icon name={movementLoading ? 'loader-4-line' : 'add-line'} className={movementLoading ? 'animate-spin' : ''} />
            {movementLoading ? 'Saving…' : 'Record movement'}
          </Button>
        </form>

        <form onSubmit={onCloseSubmit} className={`${card} border-t-4 border-t-vpos-orange p-5`}>
          <SectionHeading icon="lock-line" title="Close and reconcile" description="Count the drawer, compare it with the expected balance, and close this shift." />
          <div className="mt-5 space-y-4">
            <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle p-3.5"><span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-vpos-muted">Expected cash</span><strong className="mt-1 block text-[22px] text-vpos-text">{formatCurrency(current.expectedCash, currency)}</strong></div>
            <FormField
              label={`Counted cash (${currency})`}
              requiredMark
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={countedCash}
              onChange={(event) => onCountedCashChange(event.target.value)}
              placeholder="0.00"
            />
            <TextAreaField
              label="Closing note"
              showToolbar={false}
              rows={2}
              value={closeNote}
              onChange={(event) => onCloseNoteChange(event.target.value)}
              placeholder="Optional variance or handover note"
            />
            <Button type="submit" variant="dark" className="w-full" disabled={closeLoading}>
              <Icon name={closeLoading ? 'loader-4-line' : 'lock-line'} className={closeLoading ? 'animate-spin' : ''} />
              Close register
            </Button>
          </div>
        </form>
      </section>

      <MovementTable movements={current.movements} currency={currency} />
    </>
  )
}

function MovementTable({ movements, currency }: { movements: CashSession['movements']; currency: string }) {
  return (
    <section className={`${card} mt-[18px] overflow-hidden p-0`}>
      <header className="border-b border-vpos-line px-5 py-4"><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Register activity</h2><p className="mt-1 mb-0 text-[12px] text-vpos-muted">Manual cash movements recorded during this shift.</p></header>
      {movements.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead><tr className="bg-vpos-subtle"><th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.06em] text-vpos-muted">Type</th><th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.06em] text-vpos-muted">Reason</th><th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.06em] text-vpos-muted">Amount</th><th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.06em] text-vpos-muted">Recorded</th></tr></thead>
            <tbody>{movements.map((movement) => <tr key={movement.id} className="border-t border-vpos-line/70"><td className="px-5 py-3.5"><Status value={movement.type === 'PAY_IN' ? 'Paid in' : 'Paid out'} className={`min-w-0 ${movement.type === 'PAY_IN' ? 'bg-vpos-green-bg text-vpos-green' : 'bg-vpos-orange-bg text-vpos-orange'}`} /></td><td className="px-5 py-3.5 text-[13px] text-vpos-text">{movement.reason}</td><td className={`px-5 py-3.5 text-[13px] font-bold ${movement.type === 'PAY_IN' ? 'text-vpos-green' : 'text-vpos-orange'}`}>{movement.type === 'PAY_IN' ? '+' : '-'} {formatCurrency(movement.amount, currency)}</td><td className="px-5 py-3.5 text-[12px] text-vpos-muted">{formatReportDate(movement.createdAt)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="px-5 py-9 text-center text-[13px] text-vpos-muted">No manual cash movements have been recorded.</div>}
    </section>
  )
}

function HistoryCard({ history, currency, isLoading }: { history: CashSession[]; currency: string; isLoading: boolean }) {
  return (
    <section className={`${card} mt-[18px] overflow-hidden p-0`}>
      <header className="flex items-center justify-between border-b border-vpos-line px-5 py-4"><div><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Register history</h2><p className="mt-1 mb-0 text-[12px] text-vpos-muted">Your last 20 sessions for this store and currency.</p></div><Icon name="history-line" className="text-[20px] text-vpos-primary" /></header>
      {isLoading ? <div className="px-5 py-9 text-center text-[13px] text-vpos-muted">Loading register history…</div> : history.length === 0 ? <div className="px-5 py-9 text-center text-[13px] text-vpos-muted">Closed register sessions will appear here.</div> : (
        <div className="divide-y divide-vpos-line/70">{history.map((session) => <HistoryRow key={session.id} session={session} currency={currency} />)}</div>
      )}
    </section>
  )
}

function HistoryRow({ session, currency }: { session: CashSession; currency: string }) {
  const variance = Number(session.variance || 0)
  const varianceLabel = session.status === 'OPEN' ? 'In progress' : variance === 0 ? 'Balanced' : variance > 0 ? 'Over' : 'Short'
  const varianceClass = session.status === 'OPEN' ? 'text-vpos-primary' : variance === 0 ? 'text-vpos-green' : variance > 0 ? 'text-vpos-orange' : 'text-vpos-red'
  return (
    <div className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(180px,1.1fr)_repeat(3,minmax(120px,.7fr))_110px] md:items-center">
      <div><strong className="block text-[13px] text-vpos-text">Session #{session.id}</strong><span className="mt-1 block text-[12px] text-vpos-muted">{formatReportDate(session.openedAt)}{session.closedAt ? ` → ${formatReportDate(session.closedAt)}` : ''}</span></div>
      <HistoryValue label="Expected" value={formatCurrency(session.expectedCash, currency)} />
      <HistoryValue label="Counted" value={session.countedCash == null ? '—' : formatCurrency(session.countedCash, currency)} />
      <HistoryValue label="Variance" value={session.variance == null ? '—' : `${variance > 0 ? '+' : ''}${formatCurrency(variance, currency)}`} valueClass={varianceClass} />
      <Status
        value={varianceLabel}
        className={`min-w-0 ${session.status === 'OPEN' ? 'bg-vpos-sand text-vpos-primary' : variance === 0 ? 'bg-vpos-green-bg text-vpos-green' : variance > 0 ? 'bg-vpos-orange-bg text-vpos-orange' : 'bg-vpos-red-bg text-vpos-red'}`}
      />
    </div>
  )
}

function HistoryValue({ label, value, valueClass = 'text-vpos-text' }: { label: string; value: string; valueClass?: string }) {
  return <div><span className="block text-[10px] font-bold uppercase tracking-[0.06em] text-vpos-muted">{label}</span><strong className={`mt-1 block text-[13px] ${valueClass}`}>{value}</strong></div>
}

function SummaryTile({ label, value, detail, icon, tone = 'primary' }: { label: string; value: string; detail?: string; icon: string; tone?: 'primary' | 'positive' | 'warning' }) {
  const iconClass = tone === 'positive' ? 'bg-vpos-green-bg text-vpos-green' : tone === 'warning' ? 'bg-vpos-orange-bg text-vpos-orange' : 'bg-vpos-sand text-vpos-primary'
  return <article className={`${card} flex min-h-[132px] flex-col justify-between p-4`}><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.06em] text-vpos-muted">{label}</span><span className={`grid h-9 w-9 place-items-center rounded-md text-[18px] ${iconClass}`}><Icon name={icon} /></span></div><div><strong className="mt-4 block text-[21px] tracking-[-0.03em] text-vpos-text">{value}</strong><span className="mt-1 block text-[11px] text-vpos-muted">{detail ?? 'At register open'}</span></div></article>
}

function SectionHeading({ icon, title, description }: { icon: string; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-vpos-sand text-[20px] text-vpos-primary"><Icon name={icon} /></span><span><h2 className="m-0 text-[15px] font-extrabold text-vpos-text">{title}</h2><p className="mt-1 mb-0 text-[12px] leading-5 text-vpos-muted">{description}</p></span></div>
}

function parseAmount(value: string): number | null {
  if (!value.trim()) return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

function closeDescription(current: CashSession | null, countedCash: string, currency: string): string {
  if (!current) return 'The register will be closed and no more cash payments will be assigned to this session.'
  const counted = parseAmount(countedCash)
  const countedLabel = counted == null ? 'the entered amount' : formatCurrency(counted, currency)
  return `Expected cash is ${formatCurrency(current.expectedCash, currency)}. You counted ${countedLabel}. The session will be closed and the variance will be saved for reconciliation.`
}
