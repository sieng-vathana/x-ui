import { useEffect, useState } from 'react'
import {
  Button,
  FormField,
  Icon,
  Modal,
} from '../index'
import type { Delivery } from '../../features/deliveries/types'
import { useRecordDeliveryRemittance } from '../../features/deliveries/useDeliveries'
import { formatCurrency } from '../../lib/currency'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

export interface CodRemittanceModalProps {
  delivery: Delivery | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CodRemittanceModal({
  delivery,
  isOpen,
  onClose,
  onSuccess,
}: CodRemittanceModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [remittedAmount, setRemittedAmount] = useState('')

  const remittanceMutation = useRecordDeliveryRemittance()
  const currency = (user?.business.defaultCurrencyCode || 'USD').toUpperCase()

  useEffect(() => {
    if (!isOpen || !delivery) return
    setRemittedAmount(String(delivery.codAmount || ''))
  }, [isOpen, delivery])

  if (!delivery) return null

  const handleRemit = async () => {
    const amount = Number(remittedAmount)
    if (isNaN(amount) || amount <= 0) {
      toast('Please enter a valid remittance amount', 'warning')
      return
    }

    try {
      await remittanceMutation.mutateAsync({
        id: delivery.id,
        remittedAmount: amount,
      })
      toast('COD remittance recorded successfully', 'success')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not record remittance', 'error')
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Record COD Remittance (Delivery #${delivery.id})`}
      size="sm"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleRemit()}
            disabled={remittanceMutation.isPending}
          >
            <Icon name="checkbox-circle-line" /> Confirm Remittance
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle/50 p-3 text-[13px] space-y-1">
          <div className="flex justify-between">
            <span className="text-vpos-muted">Order ID:</span>
            <strong>#{delivery.orderId}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-vpos-muted">Provider:</span>
            <strong>{delivery.providerType}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-vpos-muted">Total COD Expected:</span>
            <strong className="text-vpos-primary">{formatCurrency(Number(delivery.codAmount || 0), currency)}</strong>
          </div>
        </div>

        <FormField
          label={`Remitted Amount (${currency})`}
          type="number"
          step="0.01"
          value={remittedAmount}
          onChange={(e) => setRemittedAmount(e.target.value)}
          placeholder="0.00"
          required
        />

        <p className="text-[12px] text-vpos-muted">
          Recording this remittance confirms that the cash collected by the courier for this order has been received into your store drawer.
        </p>
      </div>
    </Modal>
  )
}
