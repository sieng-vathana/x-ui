import { useEffect, useState } from 'react'
import {
  Button,
  FormField,
  Icon,
  Modal,
} from '../index'
import type { PosOrder } from '../../features/orders/types'
import {
  useCreateDelivery,
  useCreateDeliveryQuotes,
} from '../../features/deliveries/useDeliveries'
import type { DeliveryProviderType, DeliveryQuote } from '../../features/deliveries/types'
import { formatCurrency } from '../../lib/currency'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

export interface BookCourierModalProps {
  order: PosOrder | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function BookCourierModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: BookCourierModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [selectedProvider, setSelectedProvider] = useState<DeliveryProviderType>('GRAB')
  const [riderName, setRiderName] = useState('')
  const [riderPhone, setRiderPhone] = useState('')
  const [quotes, setQuotes] = useState<DeliveryQuote[]>([])
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quotesLoading, setQuotesLoading] = useState(false)

  const quotesMutation = useCreateDeliveryQuotes()
  const deliveryMutation = useCreateDelivery()

  const currency = (order?.currencyCode || user?.business.defaultCurrencyCode || 'USD').toUpperCase()

  useEffect(() => {
    if (!isOpen || !order) return
    setRiderName('')
    setRiderPhone('')
    setSelectedProvider('GRAB')
    setQuotes([])
    setQuoteError(null)
    setQuotesLoading(false)

    const destinationLatitude = order.deliveryAddress?.latitude
    const destinationLongitude = order.deliveryAddress?.longitude
    if (destinationLatitude == null || destinationLongitude == null) {
      setQuoteError('Add a map location to the customer delivery address before requesting courier options.')
      return
    }

    // Fetch quotes
    const fetchQuotes = async () => {
      setQuotesLoading(true)
      try {
        const res = await quotesMutation.mutateAsync({
          orderId: order.id,
          storeId: order.storeId,
          currencyCode: currency,
          destinationLatitude,
          destinationLongitude,
          receiverName: order.deliveryAddress?.receiverName || `Customer #${order.customerId}`,
          receiverPhone: order.deliveryAddress?.phone || '',
          streetAddress: order.deliveryAddress?.streetAddress || 'Store Pickup',
          provinceCity: order.deliveryAddress?.provinceCity,
          district: order.deliveryAddress?.district,
          commune: order.deliveryAddress?.commune,
          itemTotal: Number(order.grandTotal),
          isCod: order.paymentStatus === 'COD_PENDING',
        })
        setQuotes(res)
        if (res.length > 0) {
          setSelectedProvider(res[0].providerType)
        } else {
          setQuoteError('No delivery providers are enabled for this store.')
        }
      } catch (err) {
        setQuoteError(err instanceof Error ? err.message : 'Courier options could not be loaded.')
      } finally {
        setQuotesLoading(false)
      }
    }

    void fetchQuotes()
  }, [isOpen, order])

  if (!order) return null

  const handleBook = async () => {
    try {
      const quote = quotes.find((q) => q.providerType === selectedProvider)
      if (!quote) {
        toast('Select an available delivery provider with a current quote.', 'error')
        return
      }

      await deliveryMutation.mutateAsync({
        orderId: order.id,
        storeId: order.storeId,
        quoteId: quote.quoteId,
        providerType: selectedProvider,
        riderName: selectedProvider === 'OWN_RIDER' ? riderName : undefined,
        riderPhone: selectedProvider === 'OWN_RIDER' ? riderPhone : undefined,
        idempotencyKey: `DELIV-${order.id}-${Date.now()}`,
      })

      toast(`Shipment booked with ${selectedProvider.replace(/_/g, ' ')}`, 'success')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not book delivery', 'error')
    }
  }

  const selectedQuote = quotes.find((q) => q.providerType === selectedProvider)

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Book Courier for Order ${order.orderNo || `#${order.id}`}`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleBook()}
            disabled={deliveryMutation.isPending || quotesLoading || !selectedQuote || (selectedProvider === 'OWN_RIDER' && (!riderName.trim() || !riderPhone.trim()))}
          >
            <Icon name="truck-line" /> Confirm & Dispatch
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle/50 p-3 text-[13px]">
          <div>
            <strong>Recipient:</strong> {order.deliveryAddress?.receiverName || `Customer #${order.customerId}`} ({order.deliveryAddress?.phone || 'No phone'})
          </div>
          <div className="mt-1 text-vpos-muted">
            <strong>Address:</strong> {[order.deliveryAddress?.streetAddress, order.deliveryAddress?.district, order.deliveryAddress?.provinceCity].filter(Boolean).join(', ') || 'Store Pickup'}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-vpos-text">Select Delivery Provider</label>
          {quotesLoading ? (
            <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle/30 p-4 text-center text-[12px] text-vpos-muted">
              <Icon name="loader-4-line" className="mr-2 animate-spin" /> Loading enabled couriers…
            </div>
          ) : quotes.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {quotes.map((quoteOption) => {
              const provider = [
                { id: 'GRAB' as const, name: 'GrabExpress', icon: 'motorbike-line' },
                { id: 'VIREAK_BUNTHAM' as const, name: 'Vireak Buntham', icon: 'bus-2-line' },
                { id: 'OWN_RIDER' as const, name: 'In-House Rider', icon: 'user-star-line' },
              ].find((item) => item.id === quoteOption.providerType)
              if (!provider) return null
              const isSelected = selectedProvider === provider.id
              return (
                <button
                  key={quoteOption.quoteId}
                  type="button"
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`flex flex-col items-center justify-center rounded-[4px] border p-3 text-center transition-all ${
                    isSelected
                      ? 'border-vpos-primary bg-vpos-sand text-vpos-primary-2 ring-2 ring-vpos-primary/20'
                      : 'border-vpos-line bg-white hover:border-vpos-muted text-vpos-text'
                  }`}
                >
                  <Icon name={provider.icon as any} className="mb-1 text-[20px]" />
                  <span className="text-[12px] font-bold">{provider.name}</span>
                  <span className="mt-1 text-[11px] font-semibold text-vpos-primary">
                    {formatCurrency(quoteOption.quotedFee, currency)}
                  </span>
                </button>
              )
            })}
            </div>
          ) : (
            <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle/30 p-3 text-[12px] text-vpos-muted">
              {quoteError || 'No courier options are available for this store.'}
            </div>
          )}
        </div>

        {selectedProvider === 'OWN_RIDER' && (
          <div className="rounded-[4px] border border-vpos-line bg-white p-3 space-y-3">
            <h5 className="text-[12px] font-bold text-vpos-text uppercase tracking-wider">In-House Rider Information</h5>
            <FormField
              label="Rider Name"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. Sokha Chan"
              required
            />
            <FormField
              label="Rider Phone Number"
              value={riderPhone}
              onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="e.g. 012 345 678"
              required
            />
          </div>
        )}

        {selectedQuote && (
          <div className="rounded-[4px] border border-vpos-line bg-vpos-subtle/30 p-3 text-[12px] space-y-1">
            <div className="flex justify-between">
              <span className="text-vpos-muted">Estimated Delivery Time:</span>
              <strong className="text-vpos-text">{selectedQuote.estimatedMinutes ?? 35} mins</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-vpos-muted">Delivery Fee:</span>
              <strong className="text-vpos-primary">{formatCurrency(selectedQuote.quotedFee, currency)}</strong>
            </div>
            {order.paymentStatus === 'COD_PENDING' && (
              <div className="flex justify-between text-vpos-primary font-bold pt-1 border-t border-vpos-line">
                <span>COD to Collect:</span>
                <span>{formatCurrency(order.grandTotal, currency)}</span>
              </div>
            )}
          </div>
        )}
        {selectedQuote && (
          <div className="rounded-[4px] border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
            Provider booking is simulated in this environment. Confirming here does not create a live GrabExpress or Vireak Buntham booking.
          </div>
        )}
      </div>
    </Modal>
  )
}
