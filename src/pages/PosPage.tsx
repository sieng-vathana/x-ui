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
import { ShortcutsModal } from '../components/pos/ShortcutsModal'
import {
  formatKhr,
  formatUsd,
  posCategories,
  posProducts,
  type PosProduct,
} from '../data/pos-mockup'
import { useAdminStore } from '../hooks/useAdminStore'
import { cn } from '../lib/cn'
import { paths } from '../lib/paths'
import { card, pageContent, searchField } from '../lib/ui'

type CartEntry = { qty: number; discount?: LineDiscount | null }
type CartLine = {
  product: PosProduct
  qty: number
  discount?: LineDiscount | null
}
type PaymentMethod = 'qr' | 'cash'
type ViewMode = 'grid' | 'list'
type SortMode = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

const TAX_RATE = 0.0246

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
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [view, setView] = useState<ViewMode>('grid')
  const [sort, setSort] = useState<SortMode>('name-asc')
  const [payment, setPayment] = useState<PaymentMethod>('qr')
  const [customer, setCustomer] = useState('Walk-in customer')
  const [cart, setCart] = useState<Record<string, CartEntry>>({
    p4: { qty: 1 },
    p2: { qty: 1 },
  })
  const [discountTargetId, setDiscountTargetId] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

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
          // Pay Now — ready for checkout wiring
          return
        }
        if (key === 'h' || key === 'o') {
          e.preventDefault()
          // Hold list / Order list — UI hooks
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
  }, [toggleFullscreen, shortcutsOpen])

  const filtered = useMemo(() => {
    let list = posProducts.filter((p) => {
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
  }, [categoryId, query, sort])

  const lines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, entry]) => {
        const product = posProducts.find((p) => p.id === id)
        return product
          ? { product, qty: entry.qty, discount: entry.discount }
          : null
      })
      .filter(Boolean) as CartLine[]
  }, [cart])

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
  const taxVat = Math.round(subTotal * TAX_RATE * 100) / 100
  const totalUsd = Math.round((subTotal + taxVat) * 100) / 100

  const bump = (id: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev }
      const cur = next[id]
      const v = (cur?.qty ?? 0) + delta
      if (v <= 0) delete next[id]
      else next[id] = { qty: v, discount: cur?.discount }
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
    setCart((prev) => {
      const cur = prev[id]
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
            <Button variant="secondary" className="min-h-[38px]">
              <Icon name="history-line" /> Recent
            </Button>
            <Button variant="secondary" className="min-h-[38px]">
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
                <Icon name="search-line" className="text-vpos-muted" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product..."
                  className="w-full border-0 bg-transparent text-[14px] outline-none"
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
                {posCategories.map((cat) => {
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
                      <img
                        src={cat.image}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <span className="min-w-0">
                        <strong className="block truncate text-[13px] font-extrabold text-vpos-text">
                          {cat.name}
                        </strong>
                        <small className="block text-[11px] text-vpos-muted">
                          {cat.count} Items
                        </small>
                        <span
                          className={cn(
                            'mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-extrabold',
                            cat.status === 'Available'
                              ? 'bg-vpos-green-bg text-vpos-green'
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
            {view === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((p) => {
                  const qty = cart[p.id]?.qty ?? 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p.id)}
                      className="relative flex min-h-[260px] flex-col overflow-hidden rounded-[12px] border border-vpos-line bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-vpos-primary/50 hover:shadow-md"
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
                      <div className="flex h-[140px] items-center justify-center bg-vpos-subtle p-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <strong className="line-clamp-2 text-[14px] font-extrabold text-vpos-text">
                          {p.name}
                        </strong>
                        <small className="mt-1 text-[12px] text-vpos-muted">
                          {p.variant}
                        </small>
                        <div className="mt-auto flex flex-wrap items-baseline gap-1.5 pt-2">
                          <span className="text-[15px] font-extrabold text-vpos-primary">
                            {formatUsd(p.price)}
                          </span>
                          {p.oldPrice != null ? (
                            <span className="text-[12px] text-vpos-muted line-through">
                              {formatUsd(p.oldPrice)}
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
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p.id)}
                      className="flex items-center gap-3 rounded-[12px] border border-vpos-line bg-white p-2.5 text-left hover:border-vpos-primary/40"
                    >
                      <img
                        src={p.image}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block text-[14px] text-vpos-text">
                          {p.name}
                        </strong>
                        <small className="text-[12px] text-vpos-muted">
                          {p.variant}
                        </small>
                      </span>
                      {qty > 0 ? (
                        <span className="rounded-full bg-vpos-sand px-2 py-0.5 text-[12px] font-bold text-vpos-primary">
                          ×{qty}
                        </span>
                      ) : null}
                      <span className="text-[15px] font-extrabold text-vpos-primary">
                        {formatUsd(p.price)}
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
              <label className="flex h-10 items-center gap-2 rounded-[10px] border border-vpos-line bg-vpos-subtle px-3">
                <Icon name="user-line" className="text-vpos-muted" />
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full border-0 bg-transparent text-[14px] text-vpos-text outline-none"
                />
                {customer ? (
                  <button
                    type="button"
                    aria-label="Clear customer"
                    onClick={() => setCustomer('')}
                    className="border-0 bg-transparent text-vpos-muted hover:text-vpos-text"
                  >
                    <Icon name="close-line" />
                  </button>
                ) : null}
              </label>
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
                          <img
                            src={p.image}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
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
                                      : formatUsd(discount.value)}{' '}
                                    ({formatUsd(lineDisc)})
                                  </small>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-right">
                                {lineDisc > 0 ? (
                                  <span className="block text-[12px] text-vpos-muted line-through">
                                    {formatUsd(lineGross)}
                                  </span>
                                ) : null}
                                <strong className="text-[14px] text-vpos-primary">
                                  {formatUsd(lineNet)}
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
                <Row label="Sub Total" value={formatUsd(grossSubTotal)} />
                {totalDiscount > 0 ? (
                  <div className="flex justify-between text-vpos-red">
                    <span>Discount</span>
                    <span className="font-semibold">
                      −{formatUsd(totalDiscount)}
                    </span>
                  </div>
                ) : null}
                <Row label="Tax / VAT" value={formatUsd(taxVat)} />
                <div className="flex items-end justify-between border-t border-vpos-line pt-2">
                  <span className="text-[14px] font-bold text-vpos-text">
                    Total
                  </span>
                  <span className="text-right">
                    <strong className="block text-[21px] text-vpos-primary">
                      {formatUsd(totalUsd)}
                    </strong>
                    <small className="text-[12px] text-vpos-muted">
                      {formatKhr(totalUsd)}
                    </small>
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
                <Button variant="secondary" className="h-12 min-h-12 font-extrabold">
                  <Icon name="pause-circle-line" /> HOLD
                </Button>
                <Button
                  variant="primary"
                  className="h-12 min-h-12 font-extrabold"
                  disabled={lines.length === 0}
                >
                  Pay Now <Icon name="arrow-right-line" />
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </main>

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
    </div>
  )
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
