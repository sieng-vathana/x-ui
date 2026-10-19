import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import type { BillingCycle, Plan, PlanCode } from '../../features/plans/planApi'

const formatPrice = (value: number) => `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const limitText = (value: number | null, noun: string) => (value == null ? `Unlimited ${noun}` : `${value} ${noun}`)

/** The three TinhLuk plans side by side, with a monthly / yearly switch and every feature listed. */
export function PlanPicker({
  plans,
  selected,
  billingCycle,
  onSelect,
  onBillingCycleChange,
  current,
}: {
  plans: Plan[]
  selected?: PlanCode
  billingCycle: BillingCycle
  onSelect?: (code: PlanCode) => void
  onBillingCycleChange: (cycle: BillingCycle) => void
  /** The merchant's own plan, marked "Current plan" (portal view). */
  current?: PlanCode
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Billing" className="inline-flex rounded-full border border-vpos-line bg-vpos-subtle p-1 text-[13px] font-semibold">
          {(['MONTHLY', 'YEARLY'] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              role="radio"
              aria-checked={billingCycle === cycle}
              onClick={() => onBillingCycleChange(cycle)}
              className={cn('rounded-full px-4 py-1.5 transition', billingCycle === cycle ? 'bg-vpos-primary text-white' : 'text-vpos-muted hover:text-vpos-text')}
            >
              {cycle === 'MONTHLY' ? 'Monthly' : 'Yearly · 2 months free'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = selected === plan.code
          const price = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice
          const recommended = plan.code === 'BUSINESS'
          return (
            <div
              key={plan.code}
              className={cn(
                'relative flex flex-col rounded-[14px] border bg-white p-4 text-left transition',
                isSelected ? 'border-vpos-primary ring-2 ring-vpos-primary/20' : 'border-vpos-line',
                onSelect && 'cursor-pointer hover:border-vpos-primary/60',
              )}
              onClick={() => onSelect?.(plan.code)}
              role={onSelect ? 'radio' : undefined}
              aria-checked={onSelect ? isSelected : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={(event) => { if (onSelect && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(plan.code) } }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="m-0 text-[16px] font-extrabold text-vpos-text">{plan.name}</h4>
                  <p className="mt-1 mb-0 text-[12px] leading-5 text-vpos-muted">{plan.tagline}</p>
                </div>
                {current === plan.code ? (
                  <span className="shrink-0 rounded-full bg-vpos-green-bg px-2 py-0.5 text-[11px] font-bold text-vpos-green">Current plan</span>
                ) : recommended ? (
                  <span className="shrink-0 rounded-full bg-vpos-primary px-2 py-0.5 text-[11px] font-bold text-white">Popular</span>
                ) : null}
              </div>
              <p className="mt-3 mb-0">
                <strong className="text-[28px] tracking-[-0.03em] text-vpos-text" data-locale-ignore>{formatPrice(price)}</strong>
                <span className="text-[13px] text-vpos-muted"> / {billingCycle === 'YEARLY' ? 'year' : 'month'}</span>
              </p>
              <p className="mt-0.5 mb-3 text-[11px] text-vpos-muted">{plan.trialDays}-day free trial</p>
              <ul className="m-0 mb-3 list-none space-y-1 p-0 text-[12px] font-semibold text-vpos-text">
                <li>{limitText(plan.maxStores, plan.maxStores === 1 ? 'store' : 'stores')}</li>
                <li>{limitText(plan.maxStaff, 'staff accounts')}</li>
                <li>{limitText(plan.maxProducts, 'products')}</li>
              </ul>
              <ul className="m-0 flex-1 list-none space-y-1.5 border-t border-vpos-line p-0 pt-3">
                {plan.comparison.map((line) => (
                  <li key={line.key} className={cn('flex items-start gap-2 text-[12px] leading-5', line.included ? 'text-vpos-text' : 'text-vpos-muted/70 line-through')}>
                    <Icon name={line.included ? 'check-line' : 'close-line'} className={cn('mt-0.5 shrink-0', line.included ? 'text-vpos-green' : 'text-vpos-muted/60')} />
                    <span>{line.label}</span>
                  </li>
                ))}
              </ul>
              {onSelect ? (
                <span className={cn('mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold', isSelected ? 'bg-vpos-primary text-white' : 'border border-vpos-line text-vpos-text')}>
                  {isSelected ? <><Icon name="check-line" /> Selected</> : `Choose ${plan.name}`}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
