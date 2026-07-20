/** Demo data for Purchases module */

export type PoStatus =
  | 'Draft'
  | 'Ordered'
  | 'Partial'
  | 'Received'
  | 'Closed'
  | 'Cancelled'

export type ReturnStatus = 'Pending' | 'Approved' | 'Shipped' | 'Completed' | 'Rejected'

export interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  city: string
  paymentTerms: string
  products: number
  openOrders: number
  totalSpend: number
  status: 'Active' | 'Inactive'
}

export interface PurchaseOrderLine {
  sku: string
  name: string
  qtyOrdered: number
  qtyReceived: number
  unitCost: number
}

export interface PurchaseOrder {
  id: string
  ref: string
  supplierId: string
  supplierName: string
  store: string
  orderDate: string
  expectedDate: string
  status: PoStatus
  lines: PurchaseOrderLine[]
  note?: string
}

export interface SupplierReturn {
  id: string
  ref: string
  supplierId: string
  supplierName: string
  store: string
  date: string
  status: ReturnStatus
  reason: string
  items: number
  total: number
}

export const suppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Angkor Coffee Beans Co.',
    contact: 'Sokha Meas',
    phone: '+855 12 345 678',
    email: 'orders@angkorbeans.kh',
    city: 'Phnom Penh',
    paymentTerms: 'Net 30',
    products: 42,
    openOrders: 2,
    totalSpend: 18420,
    status: 'Active',
  },
  {
    id: 'sup-2',
    name: 'Mekong Dairy Supply',
    contact: 'Dara Kim',
    phone: '+855 15 222 110',
    email: 'sales@mekongdairy.kh',
    city: 'Kandal',
    paymentTerms: 'Net 15',
    products: 18,
    openOrders: 1,
    totalSpend: 6320,
    status: 'Active',
  },
  {
    id: 'sup-3',
    name: 'Golden Bakery Ingredients',
    contact: 'Srey Leak',
    phone: '+855 98 777 221',
    email: 'hello@goldenbakery.kh',
    city: 'Phnom Penh',
    paymentTerms: 'COD',
    products: 64,
    openOrders: 0,
    totalSpend: 9120,
    status: 'Active',
  },
  {
    id: 'sup-4',
    name: 'Tonle Packaging Ltd.',
    contact: 'Vannak Chea',
    phone: '+855 10 555 909',
    email: 'info@tonlepack.kh',
    city: 'Siem Reap',
    paymentTerms: 'Net 45',
    products: 28,
    openOrders: 0,
    totalSpend: 4100,
    status: 'Inactive',
  },
]

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    ref: 'PO-2048',
    supplierId: 'sup-1',
    supplierName: 'Angkor Coffee Beans Co.',
    store: 'Main Store',
    orderDate: '2026-07-12',
    expectedDate: '2026-07-20',
    status: 'Ordered',
    note: 'Rush for weekend promo',
    lines: [
      {
        sku: 'SKU-1020',
        name: 'Iced Americano beans (kg)',
        qtyOrdered: 40,
        qtyReceived: 0,
        unitCost: 8.5,
      },
      {
        sku: 'SKU-1024',
        name: 'Cold Brew concentrate (L)',
        qtyOrdered: 20,
        qtyReceived: 0,
        unitCost: 6.25,
      },
    ],
  },
  {
    id: 'po-2',
    ref: 'PO-2047',
    supplierId: 'sup-2',
    supplierName: 'Mekong Dairy Supply',
    store: 'Main Store',
    orderDate: '2026-07-10',
    expectedDate: '2026-07-18',
    status: 'Partial',
    lines: [
      {
        sku: 'SKU-1021',
        name: 'Fresh milk (case)',
        qtyOrdered: 30,
        qtyReceived: 18,
        unitCost: 12.0,
      },
      {
        sku: 'SKU-1022',
        name: 'Matcha powder (tin)',
        qtyOrdered: 12,
        qtyReceived: 12,
        unitCost: 9.5,
      },
    ],
  },
  {
    id: 'po-3',
    ref: 'PO-2046',
    supplierId: 'sup-3',
    supplierName: 'Golden Bakery Ingredients',
    store: 'Warehouse A',
    orderDate: '2026-07-05',
    expectedDate: '2026-07-12',
    status: 'Received',
    lines: [
      {
        sku: 'SKU-1023',
        name: 'Butter croissants dough',
        qtyOrdered: 100,
        qtyReceived: 100,
        unitCost: 0.85,
      },
      {
        sku: 'SKU-1025',
        name: 'Chocolate cake mix',
        qtyOrdered: 24,
        qtyReceived: 24,
        unitCost: 4.1,
      },
    ],
  },
  {
    id: 'po-4',
    ref: 'PO-2045',
    supplierId: 'sup-1',
    supplierName: 'Angkor Coffee Beans Co.',
    store: 'Main Store',
    orderDate: '2026-07-01',
    expectedDate: '2026-07-08',
    status: 'Draft',
    lines: [
      {
        sku: 'SKU-1020',
        name: 'Iced Americano beans (kg)',
        qtyOrdered: 15,
        qtyReceived: 0,
        unitCost: 8.5,
      },
    ],
  },
  {
    id: 'po-5',
    ref: 'PO-2044',
    supplierId: 'sup-4',
    supplierName: 'Tonle Packaging Ltd.',
    store: 'Main Store',
    orderDate: '2026-06-20',
    expectedDate: '2026-06-28',
    status: 'Closed',
    lines: [
      {
        sku: 'PKG-001',
        name: 'Paper cups 12oz (box)',
        qtyOrdered: 50,
        qtyReceived: 50,
        unitCost: 14.0,
      },
    ],
  },
  {
    id: 'po-6',
    ref: 'PO-2043',
    supplierId: 'sup-3',
    supplierName: 'Golden Bakery Ingredients',
    store: 'Main Store',
    orderDate: '2026-06-15',
    expectedDate: '2026-06-22',
    status: 'Cancelled',
    lines: [
      {
        sku: 'SKU-1023',
        name: 'Butter croissants dough',
        qtyOrdered: 40,
        qtyReceived: 0,
        unitCost: 0.85,
      },
    ],
  },
]

export const supplierReturns: SupplierReturn[] = [
  {
    id: 'ret-1',
    ref: 'SR-301',
    supplierId: 'sup-2',
    supplierName: 'Mekong Dairy Supply',
    store: 'Main Store',
    date: '2026-07-14',
    status: 'Pending',
    reason: 'Damaged packaging on arrival',
    items: 3,
    total: 36.0,
  },
  {
    id: 'ret-2',
    ref: 'SR-300',
    supplierId: 'sup-1',
    supplierName: 'Angkor Coffee Beans Co.',
    store: 'Main Store',
    date: '2026-07-08',
    status: 'Approved',
    reason: 'Wrong roast grade',
    items: 2,
    total: 17.0,
  },
  {
    id: 'ret-3',
    ref: 'SR-299',
    supplierId: 'sup-3',
    supplierName: 'Golden Bakery Ingredients',
    store: 'Warehouse A',
    date: '2026-06-28',
    status: 'Completed',
    reason: 'Expired flour batch',
    items: 5,
    total: 42.5,
  },
]

export function poLineTotal(line: PurchaseOrderLine): number {
  return line.qtyOrdered * line.unitCost
}

export function poTotal(po: PurchaseOrder): number {
  return po.lines.reduce((s, l) => s + poLineTotal(l), 0)
}

export function poReceivable(po: PurchaseOrder): boolean {
  return po.status === 'Ordered' || po.status === 'Partial'
}

export function money(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** POs that still have qty to receive */
export function receivableOrders(): PurchaseOrder[] {
  return purchaseOrders.filter(poReceivable)
}
