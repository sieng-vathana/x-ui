import { useMemo, useState } from 'react'
import {
  Button,
  Icon,
  Modal,
  Status,
} from '../index'
import type { PosOrder } from '../../features/orders/types'
import {
  useCancelOrder,
  useCompleteOrder,
  useConfirmOrder,
  useDeliverOrder,
  usePackOrder,
  useShipOrder,
} from '../../features/orders/useOrders'
import { useDeliveryForOrder } from '../../features/deliveries/useDeliveries'
import { formatCurrency } from '../../lib/currency'
import { formatReportDate } from '../../lib/reporting'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { openReceiptWindow, printReceipt } from '../../lib/receipt'
import { readPosSettings } from '../../features/pos/posSettings'
import type { BffStore } from '../../features/stores/types'

export interface OrderDetailModalProps {
  order: PosOrder | null
  store?: BffStore
  isOpen: boolean
  onClose: () => void
  onBookDelivery?: (order: PosOrder) => void
}

export function OrderDetailModal({
  order,
  store,
  isOpen,
  onClose,
  onBookDelivery,
}: OrderDetailModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const confirmMutation = useConfirmOrder()
  const packMutation = usePackOrder()
  const shipMutation = useShipOrder()
  const deliverMutation = useDeliverOrder()
  const completeMutation = useCompleteOrder()
  const cancelMutation = useCancelOrder()

  const deliveryQuery = useDeliveryForOrder(order?.id, isOpen && Boolean(order?.id))
  const delivery = deliveryQuery.data

  const currency = (order?.currencyCode || user?.business.defaultCurrencyCode || 'USD').toUpperCase()

  const currentStepIndex = useMemo(() => {
    if (!order) return -1
    const s = order.orderStatus.toUpperCase()
    if (s === 'PENDING_CONFIRMATION' || s === 'DRAFT') return 0
    if (s === 'CONFIRMED') return 1
    if (s === 'PACKING') return 2
    if (s === 'SHIPPED') return 3
    if (s === 'DELIVERED') return 4
    if (s === 'COMPLETED') return 5
    return -1
  }, [order])

  if (!order) return null

  const handleConfirm = async () => {
    try {
      setIsProcessing(true)
      await confirmMutation.mutateAsync(order.id)
      toast('Order confirmed successfully', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not confirm order', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePack = async () => {
    try {
      setIsProcessing(true)
      await packMutation.mutateAsync(order.id)
      toast('Order marked as packing', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not mark order as packing', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleShip = async () => {
    try {
      setIsProcessing(true)
      await shipMutation.mutateAsync(order.id)
      toast('Order marked as shipped', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not mark order as shipped', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeliver = async () => {
    try {
      setIsProcessing(true)
      await deliverMutation.mutateAsync(order.id)
      toast('Order marked as delivered', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not mark order as delivered', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleComplete = async () => {
    try {
      setIsProcessing(true)
      await completeMutation.mutateAsync(order.id)
      toast('Order completed successfully', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not complete order', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? Stock reservations will be released.')) {
      return
    }
    try {
      setIsProcessing(true)
      await cancelMutation.mutateAsync(order.id)
      toast('Order cancelled successfully', 'warning')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not cancel order', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = () => {
    const receiptWindow = openReceiptWindow()
    if (!receiptWindow) {
      toast('Receipt window was blocked. Allow pop-ups and try again.', 'warning')
      return
    }
    const settings = readPosSettings(user?.business.id)
    printReceipt(order, {
      paperSize: settings.receiptPaperSize,
      businessName: user?.business.name,
      taxRegistrationNumber: user?.business.taxRegistrationNumber,
      taxRegistrationLabel: user?.business.taxRegistrationLabel,
      businessLogoUrl: user?.business.logoUrl,
      store,
      cashierName: user?.name,
      customerName: Number(order.customerId) > 0 ? `Customer #${order.customerId}` : 'Walk-in customer',
      paymentMethod: order.paymentMethod,
      usdToKhrRate: Number(user?.business.usdToKhrExchangeRate || 4000),
      showLogo: settings.receiptShowLogo,
      showSku: settings.receiptShowSku,
      showCustomer: settings.receiptShowCustomer,
      footer: settings.receiptFooter,
    }, receiptWindow)
  }

  const isCancelled = order.orderStatus === 'CANCELLED'
  const isCompleted = order.orderStatus === 'COMPLETED'

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Order ${order.orderNo || `#${order.id}`}`}
      size="xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handlePrint}>
              <Icon name="printer-line" /> Print receipt
            </Button>
            {!isCancelled && !isCompleted && (
              <Button variant="danger" onClick={handleCancel} disabled={isProcessing}>
                <Icon name="close-circle-line" /> Cancel order
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {order.orderStatus === 'PENDING_CONFIRMATION' && (
              <Button variant="primary" onClick={handleConfirm} disabled={isProcessing}>
                <Icon name="check-line" /> Confirm order
              </Button>
            )}
            {order.orderStatus === 'CONFIRMED' && (
              <>
                {onBookDelivery && !delivery && order.fulfillmentType !== 'CUSTOMER_PICKUP' && (
                  <Button variant="secondary" onClick={() => onBookDelivery(order)}>
                    <Icon name="truck-line" /> Book courier
                  </Button>
                )}
                <Button variant="primary" onClick={handlePack} disabled={isProcessing}>
                  <Icon name="archive-line" /> Start packing
                </Button>
              </>
            )}
            {order.orderStatus === 'PACKING' && (
              <Button variant="primary" onClick={handleShip} disabled={isProcessing}>
                <Icon name="send-plane-line" /> Mark shipped / Out for delivery
              </Button>
            )}
            {order.orderStatus === 'SHIPPED' && (
              <Button variant="primary" onClick={handleDeliver} disabled={isProcessing}>
                <Icon name="checkbox-circle-line" /> Mark delivered
              </Button>
            )}
            {order.orderStatus === 'DELIVERED' && (
              <Button variant="primary" onClick={handleComplete} disabled={isProcessing}>
                <Icon name="check-double-line" /> Complete order
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-vpos-line bg-vpos-subtle/50 p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-semibold text-vpos-text">
              Channel: <span className="font-bold text-vpos-primary">{order.orderChannel || 'POS'}</span>
            </span>
            <span className="text-vpos-line">|</span>
            <span className="text-[13px] text-vpos-muted">
              Date: <strong className="text-vpos-text">{formatReportDate(order.completedAt || order.createdAt)}</strong>
            </span>
            <span className="text-vpos-line">|</span>
            <span className="text-[13px] text-vpos-muted">
              Fulfillment: <strong className="text-vpos-text">{order.fulfillmentType ? order.fulfillmentType.replace(/_/g, ' ') : 'Standard'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Status value={order.orderStatus} />
            <Status value={order.paymentStatus || 'UNPAID'} />
          </div>
        </div>

        {/* Fulfillment Stepper */}
        {!isCancelled && (
          <div className="rounded-[4px] border border-vpos-line bg-white p-4">
            <h4 className="mb-3 text-[13px] font-bold text-vpos-text uppercase tracking-wider">Fulfillment Progress</h4>
            <div className="flex items-center justify-between">
              {['Placed', 'Confirmed', 'Packing', 'Shipped', 'Delivered', 'Completed'].map((label, idx) => {
                const isPassed = currentStepIndex >= idx
                const isCurrent = currentStepIndex === idx
                return (
                  <div key={label} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                          isCurrent
                            ? 'bg-vpos-primary text-white ring-4 ring-vpos-sand'
                            : isPassed
                            ? 'bg-vpos-green text-white'
                            : 'bg-vpos-line text-vpos-muted'
                        }`}
                      >
                        {isPassed && !isCurrent ? <Icon name="check-line" className="text-[14px]" /> : idx + 1}
                      </div>
                      <span
                        className={`mt-1.5 text-[11px] font-semibold ${
                          isCurrent ? 'text-vpos-primary' : isPassed ? 'text-vpos-text' : 'text-vpos-muted'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {idx < 5 && (
                      <div
                        className={`mx-2 h-1 flex-1 rounded ${
                          currentStepIndex > idx ? 'bg-vpos-green' : 'bg-vpos-line'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Customer & Delivery Information */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[4px] border border-vpos-line bg-white p-4">
            <h4 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-vpos-text">
              <Icon name="user-3-line" className="text-vpos-primary" /> Customer Details
            </h4>
            <div className="space-y-1.5 text-[13px]">
              <div>
                <span className="text-vpos-muted">Name: </span>
                <strong className="text-vpos-text">
                  {order.deliveryAddress?.receiverName || (Number(order.customerId) > 0 ? `Customer #${order.customerId}` : 'Walk-in customer')}
                </strong>
              </div>
              <div>
                <span className="text-vpos-muted">Phone: </span>
                <strong className="text-vpos-text">{order.deliveryAddress?.phone || '—'}</strong>
              </div>
              <div>
                <span className="text-vpos-muted">Payment: </span>
                <strong className="text-vpos-text">{order.paymentMethod || 'Cash / Unrecorded'}</strong>
              </div>
              {order.note && (
                <div className="mt-2 rounded bg-vpos-subtle p-2 text-[12px] text-vpos-text">
                  <strong>Note:</strong> {order.note}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[4px] border border-vpos-line bg-white p-4">
            <h4 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-vpos-text">
              <Icon name="truck-line" className="text-vpos-primary" /> Delivery & Courier
            </h4>
            <div className="space-y-1.5 text-[13px]">
              {order.deliveryAddress ? (
                <>
                  <div>
                    <span className="text-vpos-muted">Address: </span>
                    <span className="text-vpos-text">
                      {[
                        order.deliveryAddress.streetAddress,
                        order.deliveryAddress.commune,
                        order.deliveryAddress.district,
                        order.deliveryAddress.provinceCity,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'No street address provided'}
                    </span>
                  </div>
                  {order.deliveryAddress.deliveryInstructions && (
                    <div className="text-[12px] text-vpos-muted">
                      <strong>Instructions:</strong> {order.deliveryAddress.deliveryInstructions}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-vpos-muted">No delivery address attached (In-store sale / pickup).</p>
              )}

              {delivery && (
                <div className="mt-3 rounded border border-vpos-line bg-vpos-subtle/50 p-2.5 text-[12px]">
                  <div className="flex justify-between font-semibold">
                    <span>Provider: {delivery.providerType}</span>
                    <Status value={delivery.status} />
                  </div>
                  {delivery.trackingNumber && (
                    <div className="mt-1">Tracking: <strong>{delivery.trackingNumber}</strong></div>
                  )}
                  {delivery.riderName && (
                    <div>Rider: {delivery.riderName} ({delivery.riderPhone || 'No phone'})</div>
                  )}
                  {delivery.codAmount != null && Number(delivery.codAmount) > 0 && (
                    <div className="mt-1 text-vpos-primary font-semibold">
                      COD Amount: {formatCurrency(delivery.codAmount, currency)}
                      {delivery.remittedAt ? ' (Remitted)' : ' (Pending Remittance)'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="rounded-[4px] border border-vpos-line bg-white">
          <div className="border-b border-vpos-line p-3.5">
            <h4 className="text-[13px] font-bold text-vpos-text">Order Items ({order.items?.length || 0})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-vpos-line bg-vpos-subtle text-[11px] font-bold text-vpos-muted uppercase">
                <tr>
                  <th className="py-2.5 px-3.5">Product</th>
                  <th className="py-2.5 px-3.5 text-center">Qty</th>
                  <th className="py-2.5 px-3.5 text-right">Unit Price</th>
                  <th className="py-2.5 px-3.5 text-right">Discount</th>
                  <th className="py-2.5 px-3.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vpos-line">
                {order.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-vpos-text">{item.productName}</div>
                      {item.variantName && (
                        <div className="text-[11px] text-vpos-muted">{item.variantName}</div>
                      )}
                      {item.sku && (
                        <div className="text-[11px] text-vpos-muted">SKU: {item.sku}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-bold">{item.qty || item.quantity || 1}</td>
                    <td className="py-2.5 px-3.5 text-right">{formatCurrency(item.unitPrice, currency)}</td>
                    <td className="py-2.5 px-3.5 text-right text-vpos-red">
                      {Number(item.discountAmount || 0) > 0 ? `-${formatCurrency(Number(item.discountAmount), currency)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-vpos-text">
                      {formatCurrency(item.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals */}
          <div className="border-t border-vpos-line bg-vpos-subtle/30 p-4">
            <div className="ml-auto max-w-xs space-y-2 text-[13px]">
              <div className="flex justify-between text-vpos-muted">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal, currency)}</span>
              </div>
              {Number(order.discount || 0) > 0 && (
                <div className="flex justify-between text-vpos-red font-medium">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount, currency)}</span>
                </div>
              )}
              {Number(order.deliveryFee || 0) > 0 && (
                <div className="flex justify-between text-vpos-muted">
                  <span>Delivery fee</span>
                  <span>{formatCurrency(Number(order.deliveryFee), currency)}</span>
                </div>
              )}
              {Number(order.tax || 0) > 0 && (
                <div className="flex justify-between text-vpos-muted">
                  <span>Tax</span>
                  <span>{formatCurrency(order.tax, currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-vpos-line pt-2 text-[15px] font-bold text-vpos-primary">
                <span>Grand Total</span>
                <span>{formatCurrency(order.grandTotal, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
