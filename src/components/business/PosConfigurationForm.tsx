import { useEffect, useState } from 'react'
import { Button, Icon, Select, type StoreOption } from '../../components'
import type { BusinessProfile } from '../../features/auth/types'
import { usePosSettings, type PosPaymentMethod } from '../../features/pos/posSettings'

type BusinessSettingsUpdate = (input: {
  name?: string
  defaultCurrencyCode?: string
  usdToKhrExchangeRate?: number
  pricesIncludeTax?: boolean
}) => Promise<void>

export function PosConfigurationForm({
  business,
  stores,
  updateBusinessSettings,
}: {
  business: BusinessProfile
  stores: StoreOption[]
  updateBusinessSettings: BusinessSettingsUpdate
}) {
  const { settings, updateSettings } = usePosSettings(business.id)
  const [currency, setCurrency] = useState(business.defaultCurrencyCode || 'USD')
  const [rate, setRate] = useState(String(business.usdToKhrExchangeRate || 4000))
  const [pricesIncludeTax, setPricesIncludeTax] = useState(business.pricesIncludeTax !== false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setCurrency(business.defaultCurrencyCode || 'USD')
    setRate(String(business.usdToKhrExchangeRate || 4000))
    setPricesIncludeTax(business.pricesIncludeTax !== false)
  }, [business.defaultCurrencyCode, business.id, business.pricesIncludeTax, business.usdToKhrExchangeRate])

  const saveBusinessDefaults = async () => {
    const numericRate = Number(rate.replace(/,/g, ''))
    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      setNotice('Enter a positive USD to KHR exchange rate.')
      return
    }
    try {
      await updateBusinessSettings({
        name: business.name,
        defaultCurrencyCode: currency,
        usdToKhrExchangeRate: numericRate,
        pricesIncludeTax,
      })
      setNotice('Business currency defaults saved. POS conversion will use this rate.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Business currency defaults could not be saved.')
    }
  }

  const togglePaymentMethod = (method: PosPaymentMethod, enabled: boolean) => {
    const enabledMethods = [settings.cashEnabled, settings.qrEnabled, settings.cardEnabled]
    const currentIndex = method === 'cash' ? 0 : method === 'qr' ? 1 : 2
    if (!enabled && enabledMethods.filter(Boolean).length <= 1) {
      setNotice('Keep at least one payment method enabled.')
      return
    }
    const patch = method === 'cash'
      ? { cashEnabled: enabled }
      : method === 'qr'
        ? { qrEnabled: enabled }
        : { cardEnabled: enabled }
    updateSettings(patch)
    if (!enabled && settings.defaultPaymentMethod === method) {
      const nextMethod: PosPaymentMethod = currentIndex === 0
        ? (settings.qrEnabled ? 'qr' : 'card')
        : currentIndex === 1
          ? (settings.cashEnabled ? 'cash' : 'card')
          : (settings.cashEnabled ? 'cash' : 'qr')
      updateSettings({ defaultPaymentMethod: nextMethod })
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">Business currency defaults</h3>
            <p className="mt-1 mb-0 max-w-2xl text-[13px] leading-5 text-vpos-muted">
              Product prices keep their catalog currency. The POS converts USD and KHR prices at checkout using the stored business rate.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-vpos-sand px-3 py-1.5 text-[12px] font-bold text-vpos-primary">
            <Icon name="exchange-line" /> 1 USD = {Number(rate || 0).toLocaleString('en-US')} KHR
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Select
            label="Business default currency"
            value={currency}
            onChange={setCurrency}
            options={[
              { value: 'USD', label: 'USD — US Dollar' },
              { value: 'KHR', label: 'KHR — Cambodian Riel' },
            ]}
          />
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold tracking-[.02em] text-vpos-dark">USD to KHR exchange rate <b className="text-vpos-red">*</b></span>
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className="h-[39px] w-full rounded-[4px] border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none focus:border-vpos-primary"
            />
            <small className="mt-1.5 block text-[11px] text-vpos-muted">Used for USD ↔ KHR POS conversion.</small>
          </label>
          <label className="flex min-h-[39px] items-center gap-3 self-start rounded-lg border border-vpos-line bg-vpos-subtle/45 px-3.5 py-2.5 text-[13px] text-vpos-text md:mt-6">
            <input type="checkbox" checked={pricesIncludeTax} onChange={(event) => setPricesIncludeTax(event.target.checked)} className="h-4 w-4 accent-vpos-primary" />
            <span><strong className="block text-[13px]">Prices include tax</strong><small className="text-[11px] text-vpos-muted">Business default for new sales.</small></span>
          </label>
        </div>
        {!business.usdToKhrExchangeRateConfigured ? (
          <p className="mt-4 rounded-lg border border-vpos-orange/25 bg-vpos-orange-bg px-3 py-2.5 text-[12px] font-semibold text-vpos-orange">
            This workspace was created before an exchange rate was stored. The POS is temporarily using 4,000; save the rate above to make it permanent.
          </p>
        ) : null}
        {notice ? <p aria-live="polite" className="mt-4 rounded-lg border border-vpos-primary/15 bg-vpos-sand/60 px-3 py-2.5 text-[13px] font-medium text-vpos-primary-2">{notice}</p> : null}
        <Button type="button" className="mt-4 rounded-lg" onClick={() => void saveBusinessDefaults()}><Icon name="save-3-line" /> Save currency defaults</Button>
      </section>

      <section className="rounded-2xl border border-vpos-line bg-white p-5 sm:p-6">
        <div>
          <h3 className="m-0 text-[16px] font-extrabold text-vpos-text">POS configuration</h3>
          <p className="mt-1 mb-0 text-[13px] leading-5 text-vpos-muted">These register preferences save on this device for this business and apply the next time POS opens.</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Select
            label="Default POS currency"
            value={settings.defaultCurrencyCode}
            onChange={(value) => updateSettings({ defaultCurrencyCode: value as 'BUSINESS' | 'USD' | 'KHR' })}
            options={[
              { value: 'BUSINESS', label: `Business default (${business.defaultCurrencyCode || 'USD'})` },
              { value: 'USD', label: 'USD — US Dollar' },
              { value: 'KHR', label: 'KHR — Cambodian Riel' },
            ]}
          />
          <Select
            label="Default store / register"
            value={settings.defaultStoreId}
            onChange={(value) => updateSettings({ defaultStoreId: value })}
            options={[
              { value: '', label: 'Use the active store' },
              ...stores.map((store) => ({ value: store.id, label: store.name })),
            ]}
          />
          <Select
            label="Default payment method"
            value={settings.defaultPaymentMethod}
            onChange={(value) => {
              const method = value as PosPaymentMethod
              updateSettings({
                defaultPaymentMethod: method,
                ...(method === 'cash' ? { cashEnabled: true } : method === 'qr' ? { qrEnabled: true } : { cardEnabled: true }),
              })
            }}
            options={[
              { value: 'qr', label: 'QR Code' },
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card (manual)' },
            ]}
          />
          <Select
            label="Rounding"
            value={String(settings.roundingIncrement)}
            onChange={(value) => updateSettings({ roundingIncrement: Number(value) as 0 | 1 | 5 | 10 })}
            options={[
              { value: '0', label: 'No rounding' },
              { value: '1', label: 'Nearest whole unit' },
              { value: '5', label: 'Nearest 5' },
              { value: '10', label: 'Nearest 10' },
            ]}
          />
          <Select
            label="Menu default view"
            value={settings.menuView}
            onChange={(value) => updateSettings({ menuView: value as 'grid' | 'list' })}
            options={[{ value: 'grid', label: 'Grid with product images' }, { value: 'list', label: 'Compact list' }]}
          />
          <Select
            label="Receipt paper size"
            value={settings.receiptPaperSize}
            onChange={(value) => updateSettings({ receiptPaperSize: value as '58mm' | '80mm' })}
            options={[{ value: '80mm', label: '80 mm' }, { value: '58mm', label: '58 mm' }]}
          />
        </div>

        <div className="mt-6 grid gap-3 border-t border-vpos-line pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle label="Cash payments" description="Allow cash tender and change." checked={settings.cashEnabled} onChange={(value) => togglePaymentMethod('cash', value)} />
          <Toggle label="QR payments" description="Use the simulated KHQR checkout." checked={settings.qrEnabled} onChange={(value) => togglePaymentMethod('qr', value)} />
          <Toggle label="Card payments" description="Record a manually processed card payment." checked={settings.cardEnabled} onChange={(value) => togglePaymentMethod('card', value)} />
          <Toggle label="Apply product tax" description="Include the product tax rate in POS totals." checked={settings.taxEnabled} onChange={(value) => updateSettings({ taxEnabled: value })} />
          <Toggle label="Allow discounts" description="Show the per-line discount action." checked={settings.allowDiscounts} onChange={(value) => updateSettings({ allowDiscounts: value })} />
          <Toggle label="Allow negative stock" description="Permit selling beyond the available quantity." checked={settings.allowNegativeStock} onChange={(value) => updateSettings({ allowNegativeStock: value })} />
          <Toggle label="Require a customer" description="Block checkout until a customer is selected." checked={settings.requireCustomer} onChange={(value) => updateSettings({ requireCustomer: value })} />
          <Toggle label="Hold and resume sales" description="Keep the HOLD workflow available." checked={settings.allowHoldOrders} onChange={(value) => updateSettings({ allowHoldOrders: value })} />
          <Toggle label="Show out-of-stock items" description="Keep unavailable products visible in the menu." checked={settings.showOutOfStock} onChange={(value) => updateSettings({ showOutOfStock: value })} />
          <Toggle label="Search SKU and barcode" description="Include identifiers in product search." checked={settings.searchIdentifiers} onChange={(value) => updateSettings({ searchIdentifiers: value })} />
          <Toggle label="Focus search on open" description="Put the cursor in the POS search field." checked={settings.autoFocusSearch} onChange={(value) => updateSettings({ autoFocusSearch: value })} />
          <Toggle label="Sticky order panel" description="Keep Menu and Current order anchored while scrolling." checked={settings.stickyOrderPanel} onChange={(value) => updateSettings({ stickyOrderPanel: value })} />
          <Toggle label="Auto-print receipts" description="Open a receipt print view after payment." checked={settings.autoPrintReceipt} onChange={(value) => updateSettings({ autoPrintReceipt: value })} />
        </div>
      </section>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-[70px] cursor-pointer items-start gap-3 rounded-xl border border-vpos-line bg-vpos-subtle/35 p-3 transition-colors hover:border-vpos-primary/35">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-vpos-primary" />
      <span><strong className="block text-[13px] text-vpos-text">{label}</strong><small className="mt-1 block text-[11px] leading-4 text-vpos-muted">{description}</small></span>
    </label>
  )
}
