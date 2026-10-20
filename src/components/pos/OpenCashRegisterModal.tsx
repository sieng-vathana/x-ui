import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useOpenCashSession } from '../../features/payments/usePayments'
import { formatCurrency } from '../../lib/currency'

export interface OpenCashRegisterModalProps {
  open: boolean
  onClose: () => void
  businessId: number
  storeId: number
  cashierId: number
  currencyCode: string
}

/**
 * Opens the cashier's cash register straight from the POS, so cash sales can start without leaving the screen.
 * The opening cash is what is in the drawer now; cash sales are counted against this register.
 */
export function OpenCashRegisterModal({ open, onClose, businessId, storeId, cashierId, currencyCode }: OpenCashRegisterModalProps) {
  const { toast } = useToast()
  const openSession = useOpenCashSession()
  const [openingFloat, setOpeningFloat] = useState('0')

  useEffect(() => {
    if (open) setOpeningFloat('0')
  }, [open])

  const amount = Number(openingFloat)
  const valid = Number.isFinite(amount) && amount >= 0

  const submit = async () => {
    if (!valid) return
    try {
      await openSession.mutateAsync({
        businessId,
        storeId,
        cashierId,
        currencyCode,
        openingFloat: amount,
      })
      toast('Cash register is open. You can take cash now.', 'success')
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The cash register could not be opened.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!openSession.isPending) onClose() }}
      title="Open the cash register"
      description="Count the cash in the drawer before the first sale. Cash sales are counted in this register until you close it."
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={openSession.isPending}>Cancel</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!valid || openSession.isPending}>
            <Icon name="cash-line" /> {openSession.isPending ? 'Opening…' : 'Open cash register'}
          </Button>
        </>
      )}
    >
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-bold text-vpos-muted">Opening cash in the drawer ({currencyCode})</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={currencyCode === 'KHR' ? '100' : '0.01'}
          value={openingFloat}
          onChange={(event) => setOpeningFloat(event.target.value)}
          className="h-11 w-full rounded-[4px] border border-vpos-line bg-white px-3 text-[16px] font-semibold text-vpos-text outline-none focus:border-vpos-primary"
          autoFocus
        />
      </label>
      <p className="mt-3 mb-0 text-[12px] leading-5 text-vpos-muted">
        Opening with {formatCurrency(valid ? amount : 0, currencyCode)}. You can close the register from Cash register when the shift ends.
      </p>
    </Modal>
  )
}
