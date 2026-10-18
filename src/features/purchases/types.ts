export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CLOSED' | 'CANCELLED'
export type SupplierReturnStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface Supplier {
  id: number
  businessId: number
  supplierCode: string
  supplierName: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  paymentTerms?: string | null
  status?: string | null
  storeIds?: number[]
}

export interface SupplierInput {
  businessId: number
  supplierCode?: string
  supplierName: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  paymentTerms?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface PurchaseOrderLine {
  id: number
  variantId: number
  productName: string
  variantName?: string | null
  sku?: string | null
  qtyOrdered: number
  qtyReceived: number
  unitCost: number
  lineTotal: number
}

export interface PurchaseOrder {
  id: number
  businessId: number
  storeId: number
  supplierId: number
  supplierName: string
  poNumber: string
  status: PurchaseOrderStatus
  currencyCode: string
  orderDate: string
  expectedDate?: string | null
  note?: string | null
  totalCost: number
  unitsOrdered: number
  unitsReceived: number
  createdAt: string
  orderedAt?: string | null
  receivedAt?: string | null
  lines: PurchaseOrderLine[]
}

export interface PurchaseLineInput {
  variantId: number
  quantity: number
  unitCost: number
}

export interface PurchaseOrderInput {
  businessId: number
  storeId: number
  supplierId: number
  currencyCode: string
  expectedDate?: string
  note?: string
  /** Sends the order to the supplier instead of saving a draft. */
  placeOrder?: boolean
  lines: PurchaseLineInput[]
}

export interface SupplierReturnLine {
  id: number
  variantId: number
  productName: string
  variantName?: string | null
  sku?: string | null
  quantity: number
  unitCost: number
  lineTotal: number
}

export interface SupplierReturn {
  id: number
  businessId: number
  storeId: number
  supplierId: number
  supplierName: string
  returnNumber: string
  purchaseOrderId?: number | null
  status: SupplierReturnStatus
  currencyCode: string
  reason: string
  note?: string | null
  totalCost: number
  units: number
  createdAt: string
  completedAt?: string | null
  lines: SupplierReturnLine[]
}

export interface SupplierReturnInput {
  businessId: number
  storeId: number
  supplierId: number
  purchaseOrderId?: number
  currencyCode: string
  reason: string
  note?: string
  lines: PurchaseLineInput[]
}

const ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  ORDERED: 'Ordered',
  PARTIAL: 'Partial',
  RECEIVED: 'Received',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
}

const RETURN_STATUS_LABELS: Record<SupplierReturnStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function orderStatusLabel(status: PurchaseOrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status
}

export function returnStatusLabel(status: SupplierReturnStatus): string {
  return RETURN_STATUS_LABELS[status] ?? status
}

/** Ordered and partly received orders are waiting for goods. */
export function isReceivable(order: Pick<PurchaseOrder, 'status'>): boolean {
  return order.status === 'ORDERED' || order.status === 'PARTIAL'
}

export function supplierIsActive(supplier: Pick<Supplier, 'status'>): boolean {
  return (supplier.status ?? 'ACTIVE') === 'ACTIVE'
}
