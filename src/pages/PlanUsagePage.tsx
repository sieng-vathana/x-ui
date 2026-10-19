import { useState } from 'react'
import { Breadcrumb, Icon, Topbar } from '../components'
import { PlanPicker } from '../components/plans/PlanPicker'
import type { BillingCycle } from '../features/plans/planApi'
import { useMyPlan, usePlans } from '../features/plans/usePlan'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import { parseServerTime } from '../lib/serverTime'
import { card, pageContent } from '../lib/ui'

/** The merchant's TinhLuk plan: price, trial, how much of each limit is used, and what other plans add. */
export function PlanUsagePage() {
  const myPlan = useMyPlan()
  const plans = usePlans()
  const [cycle, setCycle] = useState<BillingCycle | null>(null)
  const current = myPlan.data
  const billingCycle = cycle ?? current?.billingCycle ?? 'MONTHLY'
  const trialEnds = current?.trialEndsAt ? parseServerTime(current.trialEndsAt) : null
  const trialActive = trialEnds !== null && trialEnds.getTime() > Date.now()
  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86_400_000)) : 0

  return (
    <>
      <Topbar title="Plan & usage" subtitle="Your TinhLuk plan, its limits and what is included" />
      <main className={pageContent}>
        <section className="mb-6"><Breadcrumb items={[{ label: 'Settings', to: paths.settings }, { label: 'Plan & usage' }]} /></section>

        {myPlan.isLoading ? <section className={`${card} p-6 text-[14px] text-vpos-muted`}>Loading your plan…</section>
          : myPlan.isError || !current ? (
            <section className={`${card} p-6 text-[14px] text-vpos-muted`}>
              Your plan could not be loaded. Sign out and sign in again, then open this page.
            </section>
          ) : (
            <section className={`${card} mb-6 p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-[12px] font-extrabold tracking-[0.08em] text-vpos-muted uppercase">Current plan</p>
                  <h2 className="mt-1 mb-0 text-[24px] font-extrabold text-vpos-text">{current.plan.name}</h2>
                  <p className="mt-1 mb-0 text-[13px] text-vpos-muted">
                    <span data-locale-ignore>${current.billingCycle === 'YEARLY' ? current.plan.yearlyPrice : current.plan.monthlyPrice}</span>
                    {' '}/ {current.billingCycle === 'YEARLY' ? 'year' : 'month'}
                  </p>
                </div>
                {trialActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-vpos-orange-bg px-3 py-1 text-[12px] font-bold text-vpos-orange">
                    <Icon name="time-line" /> Free trial · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <UsageMeter label="Stores" used={current.usage.stores} max={current.plan.maxStores} />
                <UsageMeter label="Staff accounts" used={current.usage.staff} max={current.plan.maxStaff} />
                <UsageMeter label="Products" used={current.usage.products} max={current.plan.maxProducts} />
              </div>

              <p className="mt-5 mb-0 rounded-lg bg-vpos-subtle px-4 py-3 text-[13px] leading-6 text-vpos-text">
                <Icon name="customer-service-2-line" className="mr-1.5 align-[-2px] text-vpos-primary" />
                To change your plan, contact TinhLuk support. The new plan's features and limits apply as soon as it is changed.
              </p>
            </section>
          )}

        <section className={`${card} p-5`}>
          <h3 className="mt-0 mb-4 text-[16px] font-extrabold text-vpos-text">Compare plans</h3>
          {plans.data?.length ? (
            <PlanPicker plans={plans.data} billingCycle={billingCycle} onBillingCycleChange={setCycle} current={current?.plan.code} />
          ) : (
            <p className="m-0 text-[13px] text-vpos-muted">{plans.isLoading ? 'Loading plans…' : 'Plans could not be loaded.'}</p>
          )}
        </section>
      </main>
    </>
  )
}

function UsageMeter({ label, used, max }: { label: string; used: number; max: number | null }) {
  const ratio = max ? Math.min(1, used / max) : 0
  const full = max !== null && used >= max
  return (
    <div className="rounded-[12px] border border-vpos-line p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-bold text-vpos-muted">{label}</span>
        <strong className={cn('text-[15px]', full ? 'text-vpos-red' : 'text-vpos-text')} data-locale-ignore>
          {used}{max === null ? '' : ` / ${max}`}
        </strong>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-vpos-subtle">
        <div className={cn('h-full rounded-full', full ? 'bg-vpos-red' : 'bg-vpos-primary')} style={{ width: max === null ? '100%' : `${ratio * 100}%`, opacity: max === null ? 0.25 : 1 }} />
      </div>
      <p className="mt-1.5 mb-0 text-[11px] text-vpos-muted">{max === null ? 'Unlimited' : full ? 'Limit reached' : `${max - used} left`}</p>
    </div>
  )
}
