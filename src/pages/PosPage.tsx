import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Icon,
  Select,
  StoreSwitcher,
  Topbar,
} from '../components'
import { Calculator } from '../components/pos/Calculator'
import {
  calcLineDiscount,
  DiscountModal,
  type LineDiscount,
} from '../components/pos/DiscountModal'
import { PosActivityModal, type HeldOrder } from '../components/pos/PosActivityModal'
import { PosQrPaymentModal } from '../components/pos/PosQrPaymentModal'
import { ShortcutsModal } from '../components/pos/ShortcutsModal'
import { QuickCustomerModal } from '../components/customers/QuickCustomerModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useCreateCustomer, useCustomers } from '../features/customers/useCustomers'
import type { CustomerPayload } from '../features/customers/types'
import { useCreatePosOrder, useCompleteOrder } from '../features/orders/useOrders'
import type { CreatePosOrderInput } from '../features/orders/types'
import { useCreateCashPayment, useCreatePosQrCheckout, usePaymentStatus } from '../features/payments/usePayments'
import type { QrPaymentResponse } from '../features/payments/types'
import { useProductsList } from '../features/products/useProducts'
import { readHeldSales, writeHeldSales, type HeldSale } from '../features/pos/heldSales'
import { useAdminStore } from '../hooks/useAdminStore'
import { resolveImageUrl } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCurrency, formatKhr } from '../lib/currency'
import { paths } from '../lib/paths'
import { card, pageContent, searchField } from '../lib/ui'

type CartEntry = { qty: number; discount?: LineDiscount | null }
type PosProduct = {
  id: string
  variantId: number
  name: string
  variant: string
  price: number
  oldPrice?: number
  image?: string
  categoryId: string
  categoryName: string
  badge?: string
  currencyCode: string
  taxRate: number
  catalogQuantity?: number
}
type PosCategory = {
  id: string
  name: string
  count: number
  stockLeft: number
  stockKnown: boolean
  status: 'Available' | 'Restock' | 'Out of stock'
  image?: string
}
type CartLine = {
  product: PosProduct
  qty: number
  discount?: LineDiscount | null
}
type PaymentMethod = 'qr' | 'cash'
type ViewMode = 'grid' | 'list'
type SortMode = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  )
}

export function PosPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const productsQuery = useProductsList(storeId)
  const customersQuery = useCustomers()
  const createCustomerMutation = useCreateCustomer()
  const createOrderMutation = useCreatePosOrder()
  const createCashPaymentMutation = useCreateCashPayment()
  const createPosQrCheckoutMutation = useCreatePosQrCheckout()
  const completeOrderMutation = useCompleteOrder()
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [view, setView] = useState<ViewMode>('grid')
  const [sort, setSort] = useState<SortMode>('name-asc')
  const [payment, setPayment] = useState<PaymentMethod>('qr')
  const [customerId, setCustomerId] = useState('0')
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false)
  const [cart, setCart] = useState<Record<string, CartEntry>>({})
  const [heldSales, setHeldSales] = useState<HeldSale[]>(() => readHeldSales(storeId))
  const [discountTargetId, setDiscountTargetId] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [activityMode, setActivityMode] = useState<'hold' | 'recent' | null>(null)
  const [qrCheckout, setQrCheckout] = useState<{ orderNo: string; response: QrPaymentResponse } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const completedQrPaymentIdRef = useRef<number | null>(null)
  const qrPaymentQuery = usePaymentStatus(qrCheckout?.response.payment.id)
  const catRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const handleActivityAction = useCallback((action: 'resume' | 'discard' | 'receipt' | 'reorder', id: string) => {
    if (action === 'resume' || action === 'discard') {
      const heldSale = heldSales.find((sale) => sale.id === id)
      if (!heldSale) {
        toast(`Held sale ${id} is no longer available.`, 'warning')
        return
      }

      const nextHeldSales = heldSales.filter((sale) => sale.id !== id)
      setHeldSales(nextHeldSales)
      writeHeldSales(storeId, nextHeldSales)

      if (action === 'resume') {
        const restoredCart = Object.fromEntries(
          Object.entries(heldSale.cart).map(([productId, entry]) => [productId, {
            qty: entry.qty,
            discount: entry.discount ? { ...entry.discount } : null,
          }]),
        ) as Record<string, CartEntry>
        setCart(restoredCart)
        setCustomerId(heldSale.customerId || '0')
        setDiscountTargetId(null)
        setActivityMode(null)
        toast(`${id} resumed in the current checkout.`, 'success')
      } else {
        toast(`${id} discarded.`, 'warning')
      }
      return
    }

    const messages = {
      receipt: `Receipt preview for ${id} will be connected to the order service later.`,
      reorder: `Reorder for ${id} will be connected to the order service later.`,
    } as const
    toast(messages[action], 'info')
    setActivityMode(null)
  }, [heldSales, storeId, toast])

  const products = useMemo<PosProduct[]>(() => {
    return (productsQuery.data ?? []).flatMap((product) => {
      if (product.isSellable === false) return []
      const categoryId = product.category?.id ? String(product.category.id) : 'general'
      const categoryName = product.category?.categoryName || 'General'
      return (product.variants ?? []).flatMap((variant) => {
        if (!variant.id || variant.posPrice == null || variant.posPrice < 0) return []
        return [{
          id: String(variant.id),
          variantId: variant.id,
          name: product.productName,
          variant: variant.variantName || variant.sku || 'Default',
          price: Number(variant.posPrice),
          oldPrice: variant.compareAtPrice,
          image: resolveImageUrl(variant.image),
          categoryId,
          categoryName,
          badge: product.isFeatured ? 'Featured' : undefined,
          currencyCode: (product.currencyCode || 'USD').toUpperCase(),
          taxRate: Number(product.tax?.percentage ?? 0),
          catalogQuantity: variant.quantity == null ? undefined : Math.max(0, Number(variant.quantity)),
        }]
      })
    })
  }, [productsQuery.data])

  const stockByVariant = useMemo(() => {
    const stock = new Map<number, number | undefined>()
    products.forEach((product) => {
      stock.set(product.variantId, product.catalogQuantity)
    })
    return stock
  }, [products])

  const categories = useMemo<PosCategory[]>(() => {
    const grouped = new Map<string, PosCategory>()
    for (const product of products) {
      const stock = stockByVariant.get(product.variantId)
      const current = grouped.get(product.categoryId)
      if (current) {
        current.count += 1
        if (!current.image && product.image) current.image = product.image
        current.stockKnown = current.stockKnown && stock !== undefined
        current.stockLeft += stock ?? 0
        if (stock === 0 && current.status === 'Available') current.status = 'Restock'
      } else {
        grouped.set(product.categoryId, {
          id: product.categoryId,
          name: product.categoryName,
          count: 1,
          stockLeft: stock ?? 0,
          stockKnown: stock !== undefined,
          status: stock === 0 ? 'Out of stock' : 'Available',
          image: product.image,
        })
      }
    }

    const finalizeCategory = (category: PosCategory): PosCategory => {
      if (category.stockKnown && category.stockLeft === 0) return { ...category, status: 'Out of stock' }
      return category
    }
    const allStock = products.map((product) => stockByVariant.get(product.variantId))

    return [
      finalizeCategory({
        id: 'all',
        name: 'All Products',
        count: products.length,
        stockLeft: allStock.reduce<number>((sum, stock) => sum + (stock ?? 0), 0),
        stockKnown: allStock.every((stock) => stock !== undefined),
        status: products.length > 0 && allStock.some((stock) => stock === 0) ? 'Restock' : 'Available',
        image: products[0]?.image,
      }),
      ...Array.from(grouped.values()).map(finalizeCategory).sort((a, b) => a.name.localeCompare(b.name)),
    ]
  }, [products, stockByVariant])

  const customerOptions = useMemo(() => {
    const liveCustomers = (customersQuery.data?.content ?? [])
      .filter((customer) => customer.status !== 0)
      .map((customer) => ({
        value: String(customer.id),
        label: customer.phone ? `${customer.fullName} · ${customer.phone}` : customer.fullName,
      }))
    return [{ value: '0', label: 'Walk-in customer' }, ...liveCustomers.filter((customer) => customer.value !== '0')]
  }, [customersQuery.data])

  const customerNames = useMemo(
    () => new Map((customersQuery.data?.content ?? []).map((customer) => [customer.id, customer.fullName])),
    [customersQuery.data],
  )

  const heldOrders = useMemo<HeldOrder[]>(() => heldSales.map((sale) => {
    const customerNumber = Number(sale.customerId)
    const age = formatHeldAge(sale.createdAt)
    return {
      id: sale.id,
      customer: customerNumber > 0
        ? customerNames.get(customerNumber) ?? `Customer #${customerNumber}`
        : 'Walk-in customer',
      items: sale.items || `${sale.itemCount} ${sale.itemCount === 1 ? 'item' : 'items'}`,
      itemCount: sale.itemCount,
      total: sale.total,
      currencyCode: sale.currencyCode,
      age: age.label,
      ageMinutes: age.minutes,
      note: sale.note,
    }
  }), [customerNames, heldSales])

  const canCreateCustomer = user?.permissions?.includes('x-customer:create') ?? false
  const businessId = Number(user?.business.id)

  const handleQuickCustomerSave = useCallback(async (payload: CustomerPayload) => {
    try {
      const customer = await createCustomerMutation.mutateAsync(payload)
      setCustomerId(String(customer.id))
      setQuickCustomerOpen(false)
      toast('Customer added to this sale.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Customer could not be created.', 'error')
    }
  }, [createCustomerMutation, toast])

  useEffect(() => {
    setCart({})
    setHeldSales(readHeldSales(storeId))
    setCategoryId('all')
  }, [storeId])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const el = rootRef.current ?? document.documentElement
        await el.requestFullscreen?.()
      } else {
        await document.exitFullscreen?.()
      }
    } catch {
      /* ignore — browser may block */
    }
  }, [])

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const typing = isTypingTarget(e.target)

      // Ctrl/Cmd+K — global / product search
      if ((e.ctrlKey || e.metaKey) && !e.altKey && key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }

      // Focus product search: F (when not typing)
      if (!typing && !e.altKey && !e.ctrlKey && !e.metaKey && key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }

      // Fullscreen: F11 or Ctrl+Shift+F
      if (key === 'f11' || (e.ctrlKey && e.shiftKey && key === 'f')) {
        e.preventDefault()
        void toggleFullscreen()
        return
      }

      // Alt shortcuts from Shortcut Details JSON
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (key === 'q') {
          e.preventDefault()
          setPayment('qr')
          return
        }
        if (key === 'c') {
          e.preventDefault()
          setPayment('cash')
          return
        }
        if (key === 'r') {
          e.preventDefault()
          setCart({})
          setDiscountTargetId(null)
          return
        }
        if (key === 'p') {
          e.preventDefault()
          return
        }
        if (key === 'h' || key === 'o') {
          e.preventDefault()
          setActivityMode(key === 'h' ? 'hold' : 'recent')
          return
        }
      }

      // Escape: close shortcut modal / blur search / exit fullscreen
      if (key === 'escape') {
        if (shortcutsOpen) {
          e.preventDefault()
          setShortcutsOpen(false)
          return
        }
        if (activityMode) {
          e.preventDefault()
          setActivityMode(null)
          return
        }
        if (document.fullscreenElement) {
          e.preventDefault()
          void document.exitFullscreen?.()
          return
        }
        if (typing && e.target instanceof HTMLElement) {
          e.target.blur()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activityMode, shortcutsOpen, toggleFullscreen])

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (categoryId !== 'all' && p.categoryId !== categoryId) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) || p.variant.toLowerCase().includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        default:
          return a.name.localeCompare(b.name)
      }
    })
    return list
  }, [categoryId, products, query, sort])

  const lines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, entry]) => {
        const product = products.find((p) => p.id === id)
        return product
          ? { product, qty: entry.qty, discount: entry.discount }
          : null
      })
      .filter(Boolean) as CartLine[]
  }, [cart, products])

  const discountTarget = useMemo(() => {
    if (!discountTargetId) return null
    return lines.find((l) => l.product.id === discountTargetId) ?? null
  }, [discountTargetId, lines])

  const itemCount = lines.reduce((n, l) => n + l.qty, 0)
  const grossSubTotal = lines.reduce(
    (s, l) => s + l.product.price * l.qty,
    0,
  )
  const totalDiscount = lines.reduce(
    (s, l) => s + calcLineDiscount(l.product.price, l.qty, l.discount),
    0,
  )
  const subTotal =
    Math.round((grossSubTotal - totalDiscount) * 100) / 100
  const currencyCode = lines[0]?.product.currencyCode ?? 'USD'
  const taxRate = lines.length > 0 && lines.every((line) => line.product.taxRate === lines[0].product.taxRate)
    ? lines[0].product.taxRate
    : 0
  const taxVat = Math.round((subTotal * taxRate / 100) * 100) / 100
  const total = Math.round((subTotal + taxVat) * 100) / 100

  const handleHoldSale = useCallback(() => {
    const selectedStoreId = Number(storeId)
    if (!selectedStoreId) {
      toast('Select a store before holding this sale.', 'warning')
      return
    }
    if (lines.length === 0) {
      toast('Add at least one product before holding the sale.', 'warning')
      return
    }

    const heldCart = Object.fromEntries(
      lines.map((line) => [line.product.id, {
        qty: line.qty,
        discount: line.discount ? { ...line.discount } : null,
      }]),
    )
    const heldSale: HeldSale = {
      id: `HOLD-${Date.now()}`,
      customerId,
      cart: heldCart,
      items: lines.map((line) => `${line.product.name} ×${line.qty}`).join(', '),
      itemCount,
      total,
      currencyCode,
      createdAt: new Date().toISOString(),
      note: 'Paused from this register',
    }
    const nextHeldSales = [heldSale, ...heldSales]
    setHeldSales(nextHeldSales)
    writeHeldSales(storeId, nextHeldSales)
    setCart({})
    setCustomerId('0')
    setDiscountTargetId(null)
    setActivityMode('hold')
    toast(`${heldSale.id} saved.`, 'success')
  }, [currencyCode, customerId, heldSales, itemCount, lines, storeId, toast, total])

  const handlePayNow = useCallback(async () => {
    const businessId = Number(user?.business.id)
    const selectedStoreId = Number(storeId)
    const cashierId = Number(user?.id)
    if (!businessId || !selectedStoreId || !cashierId) {
      toast('Select a store and sign in before taking payment.', 'warning')
      return
    }
    if (lines.length === 0) {
      toast('Add at least one product before taking payment.', 'warning')
      return
    }

    const input: CreatePosOrderInput = {
      businessId,
      storeId: selectedStoreId,
      customerId: Number(customerId),
      cashierId,
      currencyCode,
      taxRate,
      idempotencyKey: `POS-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      items: lines.map((line) => ({
        variantId: line.product.variantId,
        quantity: line.qty,
        ...(line.discount
          ? {
              discountType: line.discount.type === 'percent' ? 'PERCENTAGE' as const : 'FIXED' as const,
              discountValue: line.discount.value,
              discountReason: 'POS manual item discount',
            }
          : {}),
      })),
    }

    try {
      if (payment === 'cash') {
        const order = await createOrderMutation.mutateAsync(input)
        await createCashPaymentMutation.mutateAsync({
          orderId: order.id,
          businessId,
          storeId: selectedStoreId,
          amount: order.grandTotal,
          tenderedAmount: order.grandTotal,
          currencyCode: order.currencyCode,
          method: 'CASH',
          provider: 'NONE',
          idempotencyKey: `PAY-${order.id}-${Date.now()}`,
          note: 'POS cash payment',
        })
        await completeOrderMutation.mutateAsync(order.id)
        toast(`Order ${order.orderNo} completed.`, 'success')
      } else {
        const items = lines
          .map((line) => `${line.product.name} x${line.qty}`)
          .join(', ')
          .slice(0, 500)
        const checkout = await createPosQrCheckoutMutation.mutateAsync({
          ...input,
          paymentIdempotencyKey: `PAY-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
          paymentNote: items,
        })
        if (!checkout.payment.qrImageDataUrl?.startsWith('data:image/')) {
          throw new Error('KHQRPay did not return a valid QR image.')
        }
        setQrCheckout({ orderNo: checkout.order.orderNo, response: checkout.payment })
        toast(`KHQR payment QR is ready for ${checkout.order.orderNo}.`, 'info')
      }
      setCart({})
      setDiscountTargetId(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Checkout could not be completed.', 'error')
    }
  }, [completeOrderMutation, createCashPaymentMutation, createOrderMutation, createPosQrCheckoutMutation, currencyCode, customerId, lines, payment, storeId, taxRate, toast, user])

  const checkoutPending = createOrderMutation.isPending
    || createCashPaymentMutation.isPending
    || createPosQrCheckoutMutation.isPending
    || completeOrderMutation.isPending

  const liveQrPayment = qrPaymentQuery.data ?? qrCheckout?.response.payment
  const liveQrCheckout = qrCheckout && liveQrPayment
    ? { ...qrCheckout, response: { ...qrCheckout.response, payment: liveQrPayment } }
    : qrCheckout

  useEffect(() => {
    if (!qrCheckout || qrPaymentQuery.data?.status !== 'PAID') return
    const paymentId = qrCheckout.response.payment.id
    if (completedQrPaymentIdRef.current === paymentId || completeOrderMutation.isPending) return

    completedQrPaymentIdRef.current = paymentId
    void completeOrderMutation.mutateAsync(qrCheckout.response.payment.orderId)
      .then(() => toast(`Payment received. Order ${qrCheckout.orderNo} completed.`, 'success'))
      .catch((error) => {
        completedQrPaymentIdRef.current = null
        toast(error instanceof Error ? error.message : 'Payment received, but the order could not be completed.', 'error')
      })
  }, [completeOrderMutation, qrCheckout, qrPaymentQuery.data?.status, toast])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        void handlePayNow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlePayNow])

  const bump = (id: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev }
      const cur = next[id]
      const v = (cur?.qty ?? 0) + delta
      const product = products.find((item) => item.id === id)
      const available = product ? stockByVariant.get(product.variantId) : undefined
      if (v <= 0) delete next[id]
      else if (available === 0) return prev
      else next[id] = { qty: available == null ? v : Math.min(v, available), discount: cur?.discount }
      return next
    })
    if (delta < 0) {
      setDiscountTargetId((cur) => {
        if (cur !== id) return cur
        const entry = cart[id]
        const nextQty = (entry?.qty ?? 0) + delta
        return nextQty <= 0 ? null : cur
      })
    }
  }

  const setLineDiscount = (id: string, discount: LineDiscount | null) => {
    setCart((prev) => {
      const cur = prev[id]
      if (!cur) return prev
      return {
        ...prev,
        [id]: {
          qty: cur.qty,
          discount: discount && discount.value > 0 ? discount : null,
        },
      }
    })
  }

  /** Add product or increase qty (preserves existing line discount) */
  const addProduct = (id: string) => {
    const product = products.find((item) => item.id === id)
    const available = product ? stockByVariant.get(product.variantId) : undefined
    setCart((prev) => {
      const cur = prev[id]
      if (available === 0 || (available != null && (cur?.qty ?? 0) >= available)) return prev
      return {
        ...prev,
        [id]: { qty: (cur?.qty ?? 0) + 1, discount: cur?.discount },
      }
    })
  }

  const scrollCats = (dir: -1 | 1) => {
    catRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  return (
    <div ref={rootRef} className="relative min-h-screen bg-vpos-bg">
      {/* Your existing top bar + colors */}
      <Topbar
        title="Point of Sale"
        subtitle="Scan or search products to build an order"
        onBack={() => navigate(paths.home)}
        afterBack={<Calculator />}
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />

      <main className={cn(pageContent, 'pb-6')}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb items={[{ label: 'Point of Sale' }]} />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              className="min-h-[38px]"
              onClick={() => setShortcutsOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={shortcutsOpen}
            >
              <Icon name="keyboard-box-line" />
              Shortcut
            </Button>
            <Button
              variant="secondary"
              className="min-h-[38px]"
              onClick={() => void toggleFullscreen()}
              title="Fullscreen (F11 or Ctrl+Shift+F)"
            >
              <Icon
                name={isFullscreen ? 'fullscreen-exit-line' : 'fullscreen-line'}
              />
              {isFullscreen ? 'Exit full screen' : 'Full screen'}
              <kbd className="ml-1 rounded border border-vpos-line bg-vpos-subtle px-1.5 py-0.5 text-[11px] font-bold text-vpos-muted">
                F11
              </kbd>
            </Button>
            <Button
              variant="secondary"
              className="min-h-[38px]"
              onClick={() => setActivityMode('recent')}
              aria-haspopup="dialog"
              aria-expanded={activityMode === 'recent'}
            >
              <Icon name="history-line" /> Recent
            </Button>
            <Button
              variant="secondary"
              className="min-h-[38px]"
              onClick={() => setActivityMode('hold')}
              aria-haspopup="dialog"
              aria-expanded={activityMode === 'hold'}
            >
              <Icon name="pause-circle-line" /> Hold list
            </Button>
          </div>
        </section>

        {/* POS body: menu + order panel (new UI, your palette) */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
          {/* ── Menu ── */}
          <section className={cn(card, 'p-4 sm:p-5')}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="m-0 text-[23px] font-extrabold tracking-tight text-vpos-text">
                  Menu
                </h2>
                <p className="m-0 mt-1 text-[13px] text-vpos-muted">
                  Browse categories and add items to the order
                </p>
              </div>
            </div>

            {/* Toolbar: search · sort · view · filter */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <label className={cn(searchField, 'min-w-[200px] flex-1')}>
                <Icon name="search-line" className="shrink-0 text-vpos-muted" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product..."
                  className="h-full w-full min-w-0 border-none bg-transparent p-0 text-[13px] text-vpos-text outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-vpos-muted"
                />
                <kbd
                  className="rounded border border-vpos-line bg-vpos-subtle px-1.5 py-0.5 text-[11px] font-bold text-vpos-muted"
                  title="Press F to focus search"
                >
                  F
                </kbd>
              </label>

              <Select
                variant="toolbar"
                value={sort}
                onChange={(v) => setSort(v as SortMode)}
                options={[
                  { value: 'name-asc', label: 'Name A-Z' },
                  { value: 'name-desc', label: 'Name Z-A' },
                  { value: 'price-asc', label: 'Price low–high' },
                  { value: 'price-desc', label: 'Price high–low' },
                ]}
              />

              <div className="flex rounded-[10px] border border-vpos-line bg-vpos-subtle p-0.5">
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setView('grid')}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-lg border-0 text-[17px]',
                    view === 'grid'
                      ? 'bg-white text-vpos-primary shadow-sm'
                      : 'bg-transparent text-vpos-muted',
                  )}
                >
                  <Icon name="grid-line" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setView('list')}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-lg border-0 text-[17px]',
                    view === 'list'
                      ? 'bg-white text-vpos-primary shadow-sm'
                      : 'bg-transparent text-vpos-muted',
                  )}
                >
                  <Icon name="list-check-2" />
                </button>
              </div>

              <button
                type="button"
                aria-label="Filter"
                className="grid h-[42px] w-[42px] place-items-center rounded-[10px] border border-vpos-line bg-white text-[17px] text-vpos-muted hover:text-vpos-primary"
              >
                <Icon name="filter-3-line" />
              </button>
            </div>

            {/* Category carousel — new */}
            <div className="relative mb-5">
              <button
                type="button"
                aria-label="Previous categories"
                onClick={() => scrollCats(-1)}
                className="absolute top-1/2 -left-1 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-vpos-line bg-white text-vpos-text shadow-sm"
              >
                <Icon name="arrow-left-s-line" />
              </button>
              <div
                ref={catRef}
                className="flex gap-3 overflow-x-auto px-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {categories.map((cat) => {
                  const selected = categoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        'flex min-w-[156px] shrink-0 items-center gap-2.5 rounded-[12px] border p-2.5 text-left transition',
                        selected
                          ? 'border-vpos-primary bg-vpos-sand shadow-sm'
                          : 'border-vpos-line bg-white hover:border-vpos-primary/40',
                      )}
                    >
                      {cat.image ? (
                        <img src={cat.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-vpos-subtle text-vpos-muted">
                          <Icon name="image-line" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <strong className="block truncate text-[13px] font-extrabold text-vpos-text">
                          {cat.name}
                        </strong>
                        <small className="block text-[11px] text-vpos-muted">
                          {cat.count} Items · {cat.stockKnown ? formatStockLabel(cat.stockLeft) : 'Checking stock…'}
                        </small>
                        <span
                          className={cn(
                            'mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-extrabold',
                            cat.status === 'Available'
                              ? 'bg-vpos-green-bg text-vpos-green'
                              : cat.status === 'Out of stock'
                                ? 'bg-vpos-red/10 text-vpos-red'
                                : 'bg-vpos-orange-bg text-vpos-orange',
                          )}
                        >
                          {cat.status}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                aria-label="Next categories"
                onClick={() => scrollCats(1)}
                className="absolute top-1/2 -right-1 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-vpos-line bg-white text-vpos-text shadow-sm"
              >
                <Icon name="arrow-right-s-line" />
              </button>
            </div>

            {/* Product grid / list with images */}
            {productsQuery.isLoading ? (
              <div className="rounded-[12px] border border-dashed border-vpos-line px-4 py-12 text-center text-[13px] text-vpos-muted">
                Loading products for this store…
              </div>
            ) : productsQuery.isError ? (
              <div className="rounded-[12px] border border-dashed border-vpos-red/40 bg-vpos-red/5 px-4 py-12 text-center text-[13px] text-vpos-red">
                {productsQuery.error instanceof Error ? productsQuery.error.message : 'Products could not be loaded.'}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-vpos-line px-4 py-12 text-center text-[13px] text-vpos-muted">
                {products.length === 0 ? 'This store has no sellable variants with a POS price.' : 'No products match your search.'}
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((p) => {
                  const qty = cart[p.id]?.qty ?? 0
                  const stock = stockByVariant.get(p.variantId)
                  const outOfStock = stock === 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => { if (!outOfStock) addProduct(p.id) }}
                      className={cn(
                        'relative flex min-h-[300px] flex-col overflow-hidden rounded-[12px] border border-vpos-line bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-vpos-primary/50 hover:shadow-md',
                        outOfStock && 'cursor-not-allowed opacity-65 hover:translate-y-0 hover:border-vpos-line hover:shadow-sm',
                      )}
                    >
                      {p.badge ? (
                        <span className="absolute top-2 left-2 z-[1] rounded-full bg-vpos-primary px-2 py-0.5 text-[10px] font-extrabold text-white">
                          {p.badge}
                        </span>
                      ) : null}
                      {qty > 0 ? (
                        <span className="absolute top-2 right-2 z-[1] grid h-6 min-w-6 place-items-center rounded-full bg-vpos-primary px-1.5 text-[12px] font-extrabold text-white">
                          {qty}
                        </span>
                      ) : null}
                      <div className="flex h-[180px] items-center justify-center bg-vpos-subtle">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Icon name="image-line" className="text-[36px] text-vpos-muted" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <strong className="line-clamp-2 text-[14px] font-extrabold text-vpos-text">
                          {p.name}
                        </strong>
                        <small className="mt-1 text-[12px] text-vpos-muted">
                          {p.variant}
                        </small>
                        <span className={cn(
                          'mt-2 w-fit rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                          stock === 0
                            ? 'bg-vpos-red/10 text-vpos-red'
                            : stock == null
                              ? 'bg-vpos-subtle text-vpos-muted'
                              : stock <= 5
                                ? 'bg-vpos-orange-bg text-vpos-orange'
                                : 'bg-vpos-green-bg text-vpos-green',
                        )}>
                          {formatStockLabel(stock)}
                        </span>
                        <div className="mt-auto flex flex-wrap items-baseline gap-1.5 pt-2">
                          <span className="text-[15px] font-extrabold text-vpos-primary">
                            {formatCurrency(p.price, p.currencyCode)}
                          </span>
                          {p.oldPrice != null ? (
                            <span className="text-[12px] text-vpos-muted line-through">
                              {formatCurrency(p.oldPrice, p.currencyCode)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((p) => {
                  const qty = cart[p.id]?.qty ?? 0
                  const stock = stockByVariant.get(p.variantId)
                  const outOfStock = stock === 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => { if (!outOfStock) addProduct(p.id) }}
                      className={cn(
                        'flex items-center gap-3 rounded-[12px] border border-vpos-line bg-white p-2.5 text-left hover:border-vpos-primary/40',
                        outOfStock && 'cursor-not-allowed opacity-65 hover:border-vpos-line',
                      )}
                    >
                      {p.image ? (
                        <img src={p.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-vpos-subtle text-vpos-muted">
                          <Icon name="image-line" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <strong className="block text-[14px] text-vpos-text">
                          {p.name}
                        </strong>
                        <small className="text-[12px] text-vpos-muted">
                          {p.variant}
                        </small>
                        <span className={cn(
                          'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                          stock === 0
                            ? 'bg-vpos-red/10 text-vpos-red'
                            : stock == null
                              ? 'bg-vpos-subtle text-vpos-muted'
                              : stock <= 5
                                ? 'bg-vpos-orange-bg text-vpos-orange'
                                : 'bg-vpos-green-bg text-vpos-green',
                        )}>
                          {formatStockLabel(stock)}
                        </span>
                      </span>
                      {qty > 0 ? (
                        <span className="rounded-full bg-vpos-sand px-2 py-0.5 text-[12px] font-bold text-vpos-primary">
                          ×{qty}
                        </span>
                      ) : null}
                      <span className="text-[15px] font-extrabold text-vpos-primary">
                        {formatCurrency(p.price, p.currencyCode)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Order panel — new ── */}
          <aside className={cn(card, 'flex max-h-[calc(100vh-200px)] flex-col overflow-hidden p-0')}>
            <div className="border-b border-vpos-line p-4">
              <h2 className="m-0 mb-2 text-[14px] font-extrabold text-vpos-text">
                Customer
              </h2>
              <Select
                value={customerId}
                onChange={setCustomerId}
                options={customerOptions}
                searchable
                searchAction={canCreateCustomer ? (
                  <Button
                    type="button"
                    variant="soft"
                    className="h-9 w-9 p-0"
                    onClick={() => setQuickCustomerOpen(true)}
                    aria-label="Add customer"
                    title="Add customer"
                  >
                    <Icon name="user-add-line" />
                  </Button>
                ) : null}
                placeholder={customersQuery.isLoading ? 'Loading customers…' : 'Select customer'}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="m-0 text-[14px] font-extrabold text-vpos-text">
                  Order Details{' '}
                  <span className="ml-1 rounded-full bg-vpos-sand px-2 py-0.5 text-[12px] text-vpos-primary">
                    {itemCount}
                  </span>
                </h2>
                {lines.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCart({})
                      setDiscountTargetId(null)
                    }}
                    className="border-0 bg-transparent text-[12px] font-bold text-vpos-red hover:underline"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {lines.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-vpos-muted">
                    No items yet. Tap a product to add.
                  </p>
                ) : (
                  lines.map(({ product: p, qty, discount }) => {
                    const lineGross = p.price * qty
                    const lineDisc = calcLineDiscount(p.price, qty, discount)
                    const lineNet = Math.max(0, lineGross - lineDisc)
                    return (
                      <div
                        key={p.id}
                        className="rounded-[12px] border border-vpos-line bg-vpos-subtle/50 p-2.5"
                      >
                        <div className="flex gap-2.5">
                          {p.image ? (
                            <img src={p.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-vpos-muted">
                              <Icon name="image-line" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <strong className="block truncate text-[14px] text-vpos-text">
                                  {p.name}
                                </strong>
                                <small className="text-[12px] text-vpos-muted">
                                  {p.variant}
                                </small>
                                {lineDisc > 0 && discount ? (
                                  <small className="mt-0.5 block text-[11px] font-bold text-vpos-red">
                                    −
                                    {discount.type === 'percent'
                                      ? `${discount.value}%`
                                      : formatCurrency(discount.value, p.currencyCode)}{' '}
                                    ({formatCurrency(lineDisc, p.currencyCode)})
                                  </small>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-right">
                                {lineDisc > 0 ? (
                                  <span className="block text-[12px] text-vpos-muted line-through">
                                    {formatCurrency(lineGross, p.currencyCode)}
                                  </span>
                                ) : null}
                                <strong className="text-[14px] text-vpos-primary">
                                  {formatCurrency(lineNet, p.currencyCode)}
                                </strong>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <IconBtn
                                  name="percent-line"
                                  label="Discount"
                                  active={lineDisc > 0}
                                  onClick={() => setDiscountTargetId(p.id)}
                                />
                                <IconBtn name="edit-line" label="Edit" />
                                <IconBtn
                                  name="delete-bin-line"
                                  label="Remove"
                                  danger
                                  onClick={() => bump(p.id, -qty)}
                                />
                              </div>
                              <div className="flex items-center rounded-lg bg-white">
                                <button
                                  type="button"
                                  aria-label="Decrease"
                                  onClick={() => bump(p.id, -1)}
                                  className="grid h-8 w-8 place-items-center border-0 bg-transparent text-vpos-primary"
                                >
                                  <Icon name="subtract-line" />
                                </button>
                                <b className="w-7 text-center text-[13px]">
                                  {qty}
                                </b>
                                <button
                                  type="button"
                                  aria-label="Increase"
                                  onClick={() => bump(p.id, 1)}
                                  className="grid h-8 w-8 place-items-center border-0 bg-transparent text-vpos-primary"
                                >
                                  <Icon name="add-line" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="mt-auto border-t border-vpos-line p-4">
              <h3 className="m-0 mb-2 text-[12px] font-extrabold tracking-wide text-vpos-muted">
                ORDER SUMMARY
              </h3>
              <div className="mb-3 space-y-1.5 text-[13px]">
                <Row label="Items" value={String(itemCount)} />
                <Row label="Sub Total" value={formatCurrency(grossSubTotal, currencyCode)} />
                {totalDiscount > 0 ? (
                  <div className="flex justify-between text-vpos-red">
                    <span>Discount</span>
                    <span className="font-semibold">
                      −{formatCurrency(totalDiscount, currencyCode)}
                    </span>
                  </div>
                ) : null}
                <Row label={`Tax / VAT${taxRate ? ` (${taxRate}%)` : ''}`} value={formatCurrency(taxVat, currencyCode)} />
                <div className="flex items-end justify-between border-t border-vpos-line pt-2">
                  <span className="text-[14px] font-bold text-vpos-text">
                    Total
                  </span>
                  <span className="text-right">
                    <strong className="block text-[21px] text-vpos-primary">
                      {formatCurrency(total, currencyCode)}
                    </strong>
                    {currencyCode === 'USD' ? (
                      <small className="text-[12px] text-vpos-muted">{formatKhr(total)}</small>
                    ) : null}
                  </span>
                </div>
              </div>

              {/* Payment methods — new */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <PayMethod
                  selected={payment === 'qr'}
                  onClick={() => setPayment('qr')}
                  icon="qr-code-line"
                  name="QR Code"
                  shortcut="ALT+Q"
                />
                <PayMethod
                  selected={payment === 'cash'}
                  onClick={() => setPayment('cash')}
                  icon="money-dollar-circle-line"
                  name="Cash"
                  shortcut="ALT+C"
                />
              </div>

              <div className="grid grid-cols-[1fr_1.6fr] gap-2">
                <Button
                  variant="secondary"
                  className="h-12 min-h-12 font-extrabold"
                  disabled={lines.length === 0 || checkoutPending}
                  onClick={handleHoldSale}
                >
                  <Icon name="pause-circle-line" /> HOLD
                </Button>
                <Button
                  variant="primary"
                  className="h-12 min-h-12 font-extrabold"
                  disabled={lines.length === 0 || checkoutPending}
                  onClick={() => void handlePayNow()}
                >
                  {checkoutPending ? 'Processing…' : 'Pay Now'} <Icon name="arrow-right-line" />
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <QuickCustomerModal
        open={quickCustomerOpen}
        onClose={() => setQuickCustomerOpen(false)}
        businessId={businessId}
        storeId={Number(storeId)}
        isLoading={createCustomerMutation.isPending}
        onSave={handleQuickCustomerSave}
      />

      <DiscountModal
        open={Boolean(discountTarget)}
        onClose={() => setDiscountTargetId(null)}
        productName={discountTarget?.product.name ?? ''}
        variant={discountTarget?.product.variant}
        unitPrice={discountTarget?.product.price ?? 0}
        quantity={discountTarget?.qty ?? 1}
        initial={discountTarget?.discount}
        onApply={(discount) => {
          if (discountTargetId) setLineDiscount(discountTargetId, discount)
        }}
      />

      {/* Backdrop covers POS content only (left nav excluded via contained layout) */}
      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        contained
      />

      <PosActivityModal
        mode={activityMode}
        onClose={() => setActivityMode(null)}
        storeId={storeId}
        customerNames={customerNames}
        heldOrders={heldOrders}
        onAction={handleActivityAction}
      />

      <PosQrPaymentModal
        key={liveQrCheckout?.response.transactionId ?? 'no-qr-checkout'}
        checkout={liveQrCheckout?.response ?? null}
        orderNo={liveQrCheckout?.orderNo}
        onClose={() => setQrCheckout(null)}
      />
    </div>
  )
}

function formatStockLabel(stock: number | undefined): string {
  if (stock === undefined) return 'Checking stock…'
  if (stock <= 0) return 'Out of stock'
  return `${stock} left`
}

function formatHeldAge(createdAt: string): { label: string; minutes: number } {
  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) return { label: 'Time unavailable', minutes: 0 }

  const minutes = Math.max(0, Math.floor((Date.now() - createdTime) / 60000))
  if (minutes < 1) return { label: 'Just now', minutes }
  if (minutes < 60) return { label: `${minutes} min ago`, minutes }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { label: `${hours} hr ago`, minutes }
  return { label: `${Math.floor(hours / 24)} day ago`, minutes }
}

function IconBtn({
  name,
  label,
  onClick,
  danger,
  active,
}: {
  name: string
  label: string
  onClick?: () => void
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-md border-0 text-[14px]',
        danger
          ? 'bg-white text-vpos-red'
          : active
            ? 'bg-vpos-sand text-vpos-primary'
            : 'bg-white text-vpos-muted hover:text-vpos-text',
      )}
    >
      <Icon name={name} />
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-vpos-muted">
      <span>{label}</span>
      <span className="font-semibold text-vpos-text">{value}</span>
    </div>
  )
}

function PayMethod({
  selected,
  onClick,
  icon,
  name,
  shortcut,
}: {
  selected: boolean
  onClick: () => void
  icon: string
  name: string
  shortcut: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-[12px] border p-3 text-left transition',
        selected
          ? 'border-vpos-primary bg-vpos-sand'
          : 'border-vpos-line bg-white hover:border-vpos-primary/40',
      )}
    >
      <Icon
        name={icon}
        className={cn(
          'text-[19px]',
          selected ? 'text-vpos-primary' : 'text-vpos-muted',
        )}
      />
      <span className="text-[13px] font-extrabold text-vpos-text">{name}</span>
      <span className="text-[11px] text-vpos-muted">{shortcut}</span>
    </button>
  )
}
