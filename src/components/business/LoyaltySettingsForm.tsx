import { useEffect, useState, type FormEvent } from 'react'
import { useToast } from '../../context/ToastContext'
import { useLoyaltyProgram, useUpdateLoyaltyProgram } from '../../features/loyalty/useLoyalty'
import { formatCurrency } from '../../lib/currency'
import { pointsValue } from '../../lib/loyalty'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { Icon } from '../ui/Icon'
import { Toggle } from '../ui/Toggle'

/** Loyalty points by phone number and member prices for saved customers. */
export function LoyaltySettingsForm({ businessId }: { businessId: number }) {
  const { toast } = useToast()
  const programQuery = useLoyaltyProgram(businessId)
  const saveMutation = useUpdateLoyaltyProgram(businessId)
  const [enabled, setEnabled] = useState(false)
  const [pointsPerUsd, setPointsPerUsd] = useState('1')
  const [pointValueUsd, setPointValueUsd] = useState('0.1')
  const [minRedeemPoints, setMinRedeemPoints] = useState('10')
  const [memberDiscountPercent, setMemberDiscountPercent] = useState('0')

  useEffect(() => {
    const program = programQuery.data
    if (!program) return
    setEnabled(program.enabled)
    setPointsPerUsd(String(program.pointsPerUsd))
    setPointValueUsd(String(program.pointValueUsd))
    setMinRedeemPoints(String(program.minRedeemPoints))
    setMemberDiscountPercent(String(program.memberDiscountPercent))
  }, [programQuery.data])

  const earnRate = Number(pointsPerUsd)
  const pointValue = Number(pointValueUsd)
  const minimum = Number(minRedeemPoints)
  const memberPercent = Number(memberDiscountPercent)
  const valid = Number.isFinite(earnRate) && earnRate >= 0
    && Number.isFinite(pointValue) && pointValue > 0
    && Number.isInteger(minimum) && minimum >= 1
    && Number.isFinite(memberPercent) && memberPercent >= 0 && memberPercent <= 100

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!valid) {
      toast('Check the loyalty numbers: a point must be worth more than $0 and the minimum at least 1 point.', 'warning')
      return
    }
    try {
      await saveMutation.mutateAsync({ enabled, pointsPerUsd: earnRate, pointValueUsd: pointValue, minRedeemPoints: minimum, memberDiscountPercent: memberPercent })
      toast('Loyalty settings saved.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Loyalty settings could not be saved.', 'error')
    }
  }

  if (programQuery.isLoading) return <p className="m-0 text-[13px] text-vpos-muted">Loading loyalty settings…</p>
  if (programQuery.isError) {
    return (
      <p className="m-0 rounded-lg border border-vpos-red/25 bg-vpos-red-bg px-3 py-2.5 text-[13px] text-vpos-red">
        {programQuery.error instanceof Error ? programQuery.error.message : 'Loyalty settings could not be loaded.'}
      </p>
    )
  }

  return (
    <form onSubmit={(event) => void save(event)} className="space-y-5">
      <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
        <Toggle
          label="Loyalty program"
          description="Customers found by phone at the POS earn points, can pay with points, and get member prices."
          checked={enabled}
          onChange={setEnabled}
        />
      </section>

      <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
        <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">Points</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FormField label="Points earned per $1" type="number" min="0" step="0.01" inputMode="decimal" value={pointsPerUsd} onChange={(event) => setPointsPerUsd(event.target.value)} />
          <FormField label="Value of 1 point ($)" type="number" min="0.0001" step="0.0001" inputMode="decimal" value={pointValueUsd} onChange={(event) => setPointValueUsd(event.target.value)} />
          <FormField label="Fewest points to use" type="number" min="1" step="1" inputMode="numeric" value={minRedeemPoints} onChange={(event) => setMinRedeemPoints(event.target.value)} />
        </div>
        {valid ? (
          <p className="mt-4 mb-0 flex items-start gap-2 rounded-lg border border-vpos-primary/15 bg-vpos-sand/60 px-3 py-2.5 text-[13px] text-vpos-primary-2">
            <Icon name="information-line" className="mt-0.5 shrink-0" />
            A $20 sale earns {Math.floor(20 * earnRate).toLocaleString('en-US')} points. 100 points pay {formatCurrency(pointsValue(100, { pointValueUsd: pointValue }, 'USD', 1), 'USD')}. Riel sales earn at your exchange rate.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
        <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">Member price</h3>
        <p className="mt-1 mb-4 text-[13px] leading-5 text-vpos-muted">Percent off every item when a saved customer is selected at the POS. Use 0 for no member price. A discount the cashier enters on an item replaces it.</p>
        <div className="max-w-[220px]">
          <FormField label="Member discount (%)" type="number" min="0" max="100" step="0.5" inputMode="decimal" value={memberDiscountPercent} onChange={(event) => setMemberDiscountPercent(event.target.value)} />
        </div>
      </section>

      <Button type="submit" className="rounded-lg" disabled={saveMutation.isPending}>
        <Icon name={saveMutation.isPending ? 'loader-4-line' : 'save-3-line'} className={saveMutation.isPending ? 'animate-spin' : ''} /> Save loyalty settings
      </Button>
    </form>
  )
}
