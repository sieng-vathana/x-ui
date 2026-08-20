import { useCallback, useEffect, useState } from 'react'
import { readStoredValue, writeStoredValue } from '../../lib/storage'

export type PosCurrencyPreference = 'BUSINESS' | 'USD' | 'KHR'
export type PosPaymentMethod = 'qr' | 'cash' | 'card'
export type PosMenuView = 'grid' | 'list'
export type PosReceiptPaperSize = '58mm' | '80mm'
export type PosRoundingIncrement = 0 | 1 | 5 | 10

export interface PosSettings {
  defaultCurrencyCode: PosCurrencyPreference
  defaultStoreId: string
  defaultPaymentMethod: PosPaymentMethod
  cashEnabled: boolean
  qrEnabled: boolean
  cardEnabled: boolean
  taxEnabled: boolean
  roundingIncrement: PosRoundingIncrement
  allowDiscounts: boolean
  allowNegativeStock: boolean
  requireCustomer: boolean
  allowHoldOrders: boolean
  autoPrintReceipt: boolean
  receiptPaperSize: PosReceiptPaperSize
  receiptShowLogo: boolean
  receiptShowSku: boolean
  receiptShowCustomer: boolean
  receiptFooter: string
  showOutOfStock: boolean
  searchIdentifiers: boolean
  autoFocusSearch: boolean
  menuView: PosMenuView
  stickyOrderPanel: boolean
}

export const defaultPosSettings: PosSettings = {
  defaultCurrencyCode: 'BUSINESS',
  defaultStoreId: '',
  defaultPaymentMethod: 'qr',
  cashEnabled: true,
  qrEnabled: true,
  cardEnabled: false,
  taxEnabled: true,
  roundingIncrement: 0,
  allowDiscounts: true,
  allowNegativeStock: false,
  requireCustomer: false,
  allowHoldOrders: true,
  autoPrintReceipt: false,
  receiptPaperSize: '80mm',
  receiptShowLogo: true,
  receiptShowSku: true,
  receiptShowCustomer: true,
  receiptFooter: 'Thank you for shopping with us.',
  showOutOfStock: true,
  searchIdentifiers: true,
  autoFocusSearch: true,
  menuView: 'grid',
  stickyOrderPanel: true,
}

const STORAGE_PREFIX = 'vpos.pos-settings.v1'
const SETTINGS_EVENT = 'vpos:pos-settings-changed'

function settingsKey(businessId?: string) {
  return `${STORAGE_PREFIX}.${businessId || 'workspace'}`
}

function normalizeSettings(value: Partial<PosSettings> | null | undefined): PosSettings {
  const merged = { ...defaultPosSettings, ...(value ?? {}) }
  const rounding = Number(merged.roundingIncrement)
  return {
    ...merged,
    defaultCurrencyCode: merged.defaultCurrencyCode === 'USD' || merged.defaultCurrencyCode === 'KHR' ? merged.defaultCurrencyCode : 'BUSINESS',
    defaultStoreId: typeof merged.defaultStoreId === 'string' ? merged.defaultStoreId : '',
    defaultPaymentMethod: merged.defaultPaymentMethod === 'cash' || merged.defaultPaymentMethod === 'card' ? merged.defaultPaymentMethod : 'qr',
    roundingIncrement: rounding === 1 || rounding === 5 || rounding === 10 ? rounding : 0,
    receiptPaperSize: merged.receiptPaperSize === '58mm' ? '58mm' : '80mm',
    menuView: merged.menuView === 'list' ? 'list' : 'grid',
    cashEnabled: merged.cashEnabled !== false,
    qrEnabled: merged.qrEnabled !== false,
    cardEnabled: merged.cardEnabled === true,
    taxEnabled: merged.taxEnabled !== false,
    allowDiscounts: merged.allowDiscounts !== false,
    allowNegativeStock: merged.allowNegativeStock === true,
    requireCustomer: merged.requireCustomer === true,
    allowHoldOrders: merged.allowHoldOrders !== false,
    autoPrintReceipt: merged.autoPrintReceipt === true,
    receiptShowLogo: merged.receiptShowLogo !== false,
    receiptShowSku: merged.receiptShowSku !== false,
    receiptShowCustomer: merged.receiptShowCustomer !== false,
    receiptFooter: typeof merged.receiptFooter === 'string' ? merged.receiptFooter.slice(0, 240) : defaultPosSettings.receiptFooter,
    showOutOfStock: merged.showOutOfStock !== false,
    searchIdentifiers: merged.searchIdentifiers !== false,
    autoFocusSearch: merged.autoFocusSearch !== false,
    stickyOrderPanel: merged.stickyOrderPanel !== false,
  }
}

export function readPosSettings(businessId?: string): PosSettings {
  return normalizeSettings(readStoredValue<Partial<PosSettings> | null>(settingsKey(businessId), null))
}

export function usePosSettings(businessId?: string) {
  const key = settingsKey(businessId)
  const [settings, setSettings] = useState<PosSettings>(() => readPosSettings(businessId))

  useEffect(() => {
    setSettings(readPosSettings(businessId))
    const onSettingsChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; settings?: PosSettings }>).detail
      if (detail?.key === key && detail.settings) setSettings(normalizeSettings(detail.settings))
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) setSettings(readPosSettings(businessId))
    }
    window.addEventListener(SETTINGS_EVENT, onSettingsChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SETTINGS_EVENT, onSettingsChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [businessId, key])

  const updateSettings = useCallback((patch: Partial<PosSettings>) => {
    setSettings((current) => {
      const next = normalizeSettings({ ...current, ...patch })
      writeStoredValue(key, next)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: { key, settings: next } }))
      }
      return next
    })
  }, [key])

  return { settings, updateSettings, storageKey: key }
}
