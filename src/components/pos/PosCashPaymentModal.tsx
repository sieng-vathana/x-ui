import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import {
  evaluateCashTender,
  formatCashMix,
  roundRiel,
  type CashReceived,
  type CashTender,
} from '../../lib/cashTender'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/currency'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

const DOLLAR_NOTES = [1, 5, 10, 20, 50, 100]
const RIEL_NOTES = [1000, 5000, 10000, 20000, 50000, 100000]

export interface PosCashPaymentModalProps {
  open: boolean
  total: number
  currencyCode: string
  usdToKhrRate: number
  submitting?: boolean
  onClose: () => void
  onConfirm: (received: CashReceived, tender: CashTender) => void
}

/** Takes cash in dollars, riel or both, and shows the change to give back. */
export function PosCashPaymentModal({
  open,
  total,
  currencyCode,
  usdToKhrRate,
  submitting = false,
  onClose,
  onConfirm,
}: PosCashPaymentModalProps) {
  const isRielOrder = currencyCode.toUpperCase() === 'KHR'
  const [dollars, setDollars] = useState('')
  const [riel, setRiel] = useState('')
  const dollarsRef = useRef<HTMLInputElement>(null)
  const rielRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setDollars('')
    setRiel('')
    // Focus after the enter animation, on the currency the shop prices in.
    const timer = window.setTimeout(() => (isRielOrder ? rielRef : dollarsRef).current?.focus(), 260)
    return () => window.clearTimeout(timer)
  }, [isRielOrder, open])

  const received: CashReceived = { usd: Number(dollars) || 0, khr: Number(riel) || 0 }
  const tender = evaluateCashTender(total, currencyCode, received, usdToKhrRate)
  const dueKhr = roundRiel(isRielOrder ? total : total * usdToKhrRate)
  const dueUsd = isRielOrder ? total / usdToKhrRate : total
  const hasCash = received.usd > 0 || received.khr > 0

  const confirm = () => {
    if (tender.enough && !submitting) onConfirm(received, tender)
  }
  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      confirm()
    }
  }
  const payExact = () => {
    if (isRielOrder) {
      setDollars('')
      setRiel(String(dueKhr))
    } else {
      setDollars(String(total))
      setRiel('')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      closeOnBackdrop={false}
      title={
        <span className="inline-flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-vpos-sand text-vpos-primary">
            <Icon name="money-dollar-circle-line" />
          </span>
          Cash payment
        </span>
      }
      description="Enter the dollars and riel the customer hands over."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={confirm} disabled={!tender.enough || submitting}>
            <Icon name={submitting ? 'loader-4-line' : 'check-line'} className={submitting ? 'animate-spin' : ''} />
            {submitting ? 'Completing…' : 'Complete payment'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-[10px] border border-vpos-line bg-vpos-subtle px-4 py-3">
          <span>
            <span className="block text-[11px] font-extrabold tracking-[0.08em] text-vpos-muted uppercase">Amount due</span>
            <strong className="mt-0.5 block text-[26px] leading-tight tracking-[-0.03em] text-vpos-text">
              {formatCurrency(total, currencyCode)}
            </strong>
            <span className="block text-[12px] text-vpos-muted">
              {isRielOrder ? `≈ ${formatCurrency(dueUsd, 'USD')}` : `៛ ${dueKhr.toLocaleString('en-US')}`}
              {' · '}1 USD = {usdToKhrRate.toLocaleString('en-US')} KHR
            </span>
          </span>
          <Button variant="soft" onClick={payExact}>
            <Icon name="check-double-line" /> Exact amount
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CashInput
            label="Dollars received"
            symbol="$"
            inputRef={dollarsRef}
            value={dollars}
            onChange={setDollars}
            onKeyDown={submitOnEnter}
            allowDecimals
            notes={DOLLAR_NOTES}
            formatNote={(note) => `$${note}`}
          />
          <CashInput
            label="Riel received"
            symbol="៛"
            inputRef={rielRef}
            value={riel}
            onChange={setRiel}
            onKeyDown={submitOnEnter}
            notes={RIEL_NOTES}
            formatNote={(note) => note.toLocaleString('en-US')}
          />
        </div>

        <div
          className={cn(
            'rounded-[10px] border px-4 py-3',
            !hasCash
              ? 'border-vpos-line bg-white'
              : tender.enough
                ? 'border-vpos-green/30 bg-vpos-green-bg'
                : 'border-vpos-orange/30 bg-vpos-orange-bg',
          )}
          aria-live="polite"
        >
          {!hasCash ? (
            <span className="text-[13px] text-vpos-muted">Tap the notes the customer gives, or type the amounts.</span>
          ) : tender.enough ? (
            <>
              <span className="block text-[11px] font-extrabold tracking-[0.08em] text-vpos-green uppercase">Change to give</span>
              <strong className="mt-0.5 block text-[24px] leading-tight tracking-[-0.03em] text-vpos-text">
                {tender.changeAllKhr > 0 ? formatCashMix(tender.changeUsd, tender.changeKhr) : 'No change'}
              </strong>
              {tender.changeUsd > 0 ? (
                <span className="block text-[12px] text-vpos-muted">or ៛ {tender.changeAllKhr.toLocaleString('en-US')} all in riel</span>
              ) : null}
              <span className="mt-1 block text-[12px] text-vpos-muted">Received {formatCashMix(received.usd, received.khr)}</span>
            </>
          ) : (
            <>
              <span className="block text-[11px] font-extrabold tracking-[0.08em] text-vpos-orange uppercase">Still due</span>
              <strong className="mt-0.5 block text-[24px] leading-tight tracking-[-0.03em] text-vpos-text">
                ៛ {tender.shortKhr.toLocaleString('en-US')}
              </strong>
              <span className="block text-[12px] text-vpos-muted">≈ {formatCurrency(tender.shortKhr / usdToKhrRate, 'USD')}</span>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

function CashInput({
  label,
  symbol,
  inputRef,
  value,
  onChange,
  onKeyDown,
  allowDecimals = false,
  notes,
  formatNote,
}: {
  label: string
  symbol: string
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  allowDecimals?: boolean
  notes: number[]
  formatNote: (note: number) => string
}) {
  const clean = (raw: string) => {
    if (!allowDecimals) return raw.replace(/\D/g, '')
    const digits = raw.replace(/[^\d.]/g, '')
    const [whole, ...fraction] = digits.split('.')
    return fraction.length > 0 ? `${whole}.${fraction.join('').slice(0, 2)}` : whole
  }
  // Each tap adds one note, so $20 + $5 is two taps.
  const addNote = (note: number) => onChange(String(Math.round(((Number(value) || 0) + note) * 100) / 100))

  return (
    <div>
      <span className="mb-1.5 flex items-center justify-between text-[12px] font-extrabold tracking-wide text-vpos-muted uppercase">
        {label}
        {value ? (
          <button type="button" className="text-[11px] font-bold tracking-normal text-vpos-primary normal-case hover:underline" onClick={() => onChange('')}>
            Clear
          </button>
        ) : null}
      </span>
      <div className="flex h-12 items-center gap-2 rounded-[10px] border border-vpos-line bg-white px-3 transition-all duration-200 focus-within:border-vpos-primary focus-within:shadow-[0_0_0_3px_#1d546c24]">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-vpos-subtle text-[14px] font-extrabold text-vpos-muted">{symbol}</span>
        <input
          ref={inputRef}
          type="text"
          inputMode={allowDecimals ? 'decimal' : 'numeric'}
          autoComplete="off"
          spellCheck={false}
          aria-label={label}
          placeholder="0"
          value={value}
          onChange={(event) => onChange(clean(event.target.value))}
          onKeyDown={onKeyDown}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 border-0 bg-transparent text-[18px] font-bold text-vpos-text outline-none placeholder:text-vpos-muted"
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {notes.map((note) => (
          <button
            key={note}
            type="button"
            onClick={() => addNote(note)}
            className="min-h-[34px] rounded-[6px] border border-vpos-line bg-white px-1 text-[12px] font-bold text-vpos-text transition hover:border-vpos-primary/45 hover:bg-vpos-subtle"
          >
            +{formatNote(note)}
          </button>
        ))}
      </div>
    </div>
  )
}
