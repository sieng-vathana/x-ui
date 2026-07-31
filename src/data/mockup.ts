/** Demo data mirrored from VPOS-HTML-Mockup */

export type ProductTone =
  | 'ice'
  | 'sand'
  | 'matcha'
  | 'pastry'
  | 'stone'
  | 'rose'
  | 'lemon'

export interface MockProduct {
  name: string
  sku: string
  barcode: string
  category: string
  price: number
  stock: number
  status: 'Active' | 'Low stock' | 'Out of stock' | 'Inactive'
  tone: ProductTone
}

export const products: MockProduct[] = [
  {
    name: 'Iced Americano',
    sku: 'SKU-1020',
    barcode: '885001020',
    category: 'Coffee',
    price: 3.5,
    stock: 24,
    status: 'Active',
    tone: 'ice',
  },
  {
    name: 'Cappuccino',
    sku: 'SKU-1021',
    barcode: '885001021',
    category: 'Coffee',
    price: 4.25,
    stock: 16,
    status: 'Active',
    tone: 'sand',
  },
  {
    name: 'Matcha Latte',
    sku: 'SKU-1022',
    barcode: '885001022',
    category: 'Tea',
    price: 4.75,
    stock: 8,
    status: 'Low stock',
    tone: 'matcha',
  },
  {
    name: 'Croissant',
    sku: 'SKU-1023',
    barcode: '885001023',
    category: 'Bakery',
    price: 2.8,
    stock: 12,
    status: 'Active',
    tone: 'pastry',
  },
  {
    name: 'Cold Brew',
    sku: 'SKU-1024',
    barcode: '885001024',
    category: 'Coffee',
    price: 4,
    stock: 19,
    status: 'Active',
    tone: 'stone',
  },
  {
    name: 'Chocolate Cake',
    sku: 'SKU-1025',
    barcode: '885001025',
    category: 'Bakery',
    price: 3.25,
    stock: 6,
    status: 'Low stock',
    tone: 'rose',
  },
  {
    name: 'Fresh Lemon Tea',
    sku: 'SKU-1026',
    barcode: '885001026',
    category: 'Tea',
    price: 3.75,
    stock: 21,
    status: 'Active',
    tone: 'lemon',
  },
  {
    name: 'Chicken Sandwich',
    sku: 'SKU-1027',
    barcode: '885001027',
    category: 'Meals',
    price: 5.5,
    stock: 11,
    status: 'Active',
    tone: 'sand',
  },
  {
    name: 'Sparkling Water',
    sku: 'SKU-1028',
    barcode: '885001028',
    category: 'Cold drinks',
    price: 1.5,
    stock: 0,
    status: 'Out of stock',
    tone: 'ice',
  },
  {
    name: 'Espresso Shot',
    sku: 'SKU-1029',
    barcode: '885001029',
    category: 'Coffee',
    price: 2.25,
    stock: 40,
    status: 'Active',
    tone: 'stone',
  },
  {
    name: 'Green Tea',
    sku: 'SKU-1030',
    barcode: '885001030',
    category: 'Tea',
    price: 3.0,
    stock: 14,
    status: 'Active',
    tone: 'matcha',
  },
  {
    name: 'Blueberry Muffin',
    sku: 'SKU-1031',
    barcode: '885001031',
    category: 'Bakery',
    price: 2.5,
    stock: 9,
    status: 'Low stock',
    tone: 'pastry',
  },
  {
    name: 'Iced Latte',
    sku: 'SKU-1032',
    barcode: '885001032',
    category: 'Coffee',
    price: 4.5,
    stock: 22,
    status: 'Active',
    tone: 'ice',
  },
  {
    name: 'Tuna Sandwich',
    sku: 'SKU-1033',
    barcode: '885001033',
    category: 'Meals',
    price: 5.25,
    stock: 7,
    status: 'Low stock',
    tone: 'sand',
  },
  {
    name: 'Orange Juice',
    sku: 'SKU-1034',
    barcode: '885001034',
    category: 'Cold drinks',
    price: 2.75,
    stock: 18,
    status: 'Active',
    tone: 'lemon',
  },
  {
    name: 'Bagel',
    sku: 'SKU-1035',
    barcode: '885001035',
    category: 'Bakery',
    price: 1.8,
    stock: 30,
    status: 'Active',
    tone: 'pastry',
  },
  {
    name: 'Mocha',
    sku: 'SKU-1036',
    barcode: '885001036',
    category: 'Coffee',
    price: 4.75,
    stock: 0,
    status: 'Out of stock',
    tone: 'rose',
  },
  {
    name: 'Seasonal Special',
    sku: 'SKU-1037',
    barcode: '885001037',
    category: 'Coffee',
    price: 5.0,
    stock: 5,
    status: 'Inactive',
    tone: 'sand',
  },
  {
    name: 'Mineral Water',
    sku: 'SKU-1038',
    barcode: '885001038',
    category: 'Cold drinks',
    price: 1.0,
    stock: 60,
    status: 'Active',
    tone: 'ice',
  },
  {
    name: 'Cheese Danish',
    sku: 'SKU-1039',
    barcode: '885001039',
    category: 'Bakery',
    price: 2.9,
    stock: 11,
    status: 'Active',
    tone: 'pastry',
  },
  {
    name: 'Chai Latte',
    sku: 'SKU-1040',
    barcode: '885001040',
    category: 'Tea',
    price: 4.25,
    stock: 13,
    status: 'Active',
    tone: 'sand',
  },
]

/**
 * Reusable option type for products with options.
 * NOT a sellable item — no price, no stock.
 * Example: Size → S, M, L | Color → Black, White
 * When creating a product, pick these options; combinations become SKUs later on that product.
 */
export interface ProductOptionType {
  id: string
  /** Option name: Size, Color, Temperature… */
  name: string
  /** Allowed values for this option */
  values: string[]
  /** How many products use this option (demo) */
  usedOnProducts: number
  status: 'Active' | 'Inactive'
}

export const productOptionTypes: ProductOptionType[] = [
  {
    id: 'opt-size',
    name: 'Size',
    values: ['S', 'M', 'L', 'XL'],
    usedOnProducts: 3,
    status: 'Active',
  },
  {
    id: 'opt-color',
    name: 'Color',
    values: ['Black', 'White', 'Navy', 'Red'],
    usedOnProducts: 2,
    status: 'Active',
  },
  {
    id: 'opt-cup',
    name: 'Cup size',
    values: ['Regular (12oz)', 'Large (16oz)'],
    usedOnProducts: 5,
    status: 'Active',
  },
  {
    id: 'opt-temp',
    name: 'Temperature',
    values: ['Hot', 'Iced'],
    usedOnProducts: 4,
    status: 'Active',
  },
  {
    id: 'opt-milk',
    name: 'Milk',
    values: ['Dairy', 'Oat', 'Soy', 'Almond'],
    usedOnProducts: 2,
    status: 'Active',
  },
  {
    id: 'opt-flavor',
    name: 'Flavor',
    values: ['Plain', 'Chocolate', 'Almond'],
    usedOnProducts: 1,
    status: 'Active',
  },
  {
    id: 'opt-portion',
    name: 'Portion',
    values: ['Slice', 'Whole'],
    usedOnProducts: 1,
    status: 'Inactive',
  },
]



export const navPrimary = [
  { key: 'dashboard', label: 'Overview', icon: 'dashboard-line' },
  { key: 'pos', label: 'Point of Sale', icon: 'store-2-line' },
  { key: 'products', label: 'Products', icon: 'shopping-bag-3-line' },
] as const

/** Stock in/out history under Products */
export type StockMovementType =
  | 'Sale'
  | 'Purchase receive'
  | 'Adjustment'
  | 'Transfer in'
  | 'Transfer out'
  | 'Return to supplier'
  | 'Customer return'

export interface StockMovement {
  id: string
  date: string
  time: string
  type: StockMovementType
  sku: string
  productName: string
  location: string
  qtyChange: number
  balanceAfter: number
  ref: string
  user: string
  note?: string
}

export const stockMovements: StockMovement[] = [
  {
    id: 'sm-1',
    date: '2026-07-18',
    time: '14:22',
    type: 'Sale',
    sku: 'SKU-1020',
    productName: 'Iced Americano',
    location: 'Main Store',
    qtyChange: -2,
    balanceAfter: 22,
    ref: 'INV-2048',
    user: 'Vathana',
  },
  {
    id: 'sm-2',
    date: '2026-07-18',
    time: '11:05',
    type: 'Purchase receive',
    sku: 'SKU-1021',
    productName: 'Cappuccino',
    location: 'Main Store',
    qtyChange: 18,
    balanceAfter: 34,
    ref: 'PO-2047',
    user: 'Dara',
    note: 'Partial receive',
  },
  {
    id: 'sm-3',
    date: '2026-07-17',
    time: '16:40',
    type: 'Adjustment',
    sku: 'SKU-1023',
    productName: 'Croissant',
    location: 'Main Store',
    qtyChange: -3,
    balanceAfter: 9,
    ref: 'ADJ-88',
    user: 'Vathana',
    note: 'Damaged batch',
  },
  {
    id: 'sm-4',
    date: '2026-07-17',
    time: '09:15',
    type: 'Transfer out',
    sku: 'SKU-1024',
    productName: 'Cold Brew',
    location: 'Main Store',
    qtyChange: -5,
    balanceAfter: 14,
    ref: 'TR-12',
    user: 'Dara',
    note: 'To Warehouse A',
  },
  {
    id: 'sm-5',
    date: '2026-07-17',
    time: '09:18',
    type: 'Transfer in',
    sku: 'SKU-1024',
    productName: 'Cold Brew',
    location: 'Warehouse A',
    qtyChange: 5,
    balanceAfter: 5,
    ref: 'TR-12',
    user: 'Dara',
  },
  {
    id: 'sm-6',
    date: '2026-07-16',
    time: '18:02',
    type: 'Sale',
    sku: 'SKU-1022',
    productName: 'Matcha Latte',
    location: 'Main Store',
    qtyChange: -1,
    balanceAfter: 8,
    ref: 'INV-2046',
    user: 'Vathana',
  },
  {
    id: 'sm-7',
    date: '2026-07-16',
    time: '10:30',
    type: 'Customer return',
    sku: 'SKU-1025',
    productName: 'Chocolate Cake',
    location: 'Main Store',
    qtyChange: 1,
    balanceAfter: 7,
    ref: 'RET-19',
    user: 'Sokha',
  },
  {
    id: 'sm-8',
    date: '2026-07-15',
    time: '13:00',
    type: 'Return to supplier',
    sku: 'SKU-1021',
    productName: 'Cappuccino',
    location: 'Main Store',
    qtyChange: -2,
    balanceAfter: 16,
    ref: 'SR-301',
    user: 'Dara',
    note: 'Damaged packaging',
  },
  {
    id: 'sm-9',
    date: '2026-07-15',
    time: '08:45',
    type: 'Purchase receive',
    sku: 'SKU-1023',
    productName: 'Croissant',
    location: 'Warehouse A',
    qtyChange: 100,
    balanceAfter: 100,
    ref: 'PO-2046',
    user: 'Dara',
  },
  {
    id: 'sm-10',
    date: '2026-07-14',
    time: '19:20',
    type: 'Sale',
    sku: 'SKU-1028',
    productName: 'Sparkling Water',
    location: 'Main Store',
    qtyChange: -4,
    balanceAfter: 0,
    ref: 'INV-2040',
    user: 'Vathana',
  },
  {
    id: 'sm-11',
    date: '2026-07-14',
    time: '12:10',
    type: 'Adjustment',
    sku: 'SKU-1031',
    productName: 'Blueberry Muffin',
    location: 'Main Store',
    qtyChange: 2,
    balanceAfter: 9,
    ref: 'ADJ-87',
    user: 'Sokha',
    note: 'Stock count correction',
  },
  {
    id: 'sm-12',
    date: '2026-07-13',
    time: '15:55',
    type: 'Sale',
    sku: 'SKU-1036',
    productName: 'Mocha',
    location: 'Main Store',
    qtyChange: -1,
    balanceAfter: 0,
    ref: 'INV-2035',
    user: 'Vathana',
  },
]

/** Low stock = Low stock status or stock at/below threshold */
export const LOW_STOCK_THRESHOLD = 10

export function isLowOrOutOfStock(p: MockProduct): boolean {
  return (
    p.status === 'Low stock' ||
    p.status === 'Out of stock' ||
    p.stock <= LOW_STOCK_THRESHOLD
  )
}

export const money = (n: number) => `$${n.toFixed(2)}`

export const recentSales = [
  {
    invoice: '#INV-2048',
    customer: 'Walk-in customer',
    cashier: 'Vathana',
    payment: 'ABA Pay',
    total: '$128.50',
    status: 'Completed',
  },
  {
    invoice: '#INV-2047',
    customer: 'Sokha Retail',
    cashier: 'Dara',
    payment: 'Cash',
    total: '$74.20',
    status: 'Completed',
  },
  {
    invoice: '#INV-2046',
    customer: 'Kim Coffee',
    cashier: 'Vathana',
    payment: 'Card',
    total: '$96.00',
    status: 'Pending',
  },
]

export const salesBars = [45, 64, 53, 82, 68, 96, 88]
export const expenseBars = [24, 34, 28, 44, 36, 51, 47]
export const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type StoreStatus = 'Open' | 'Closed' | 'Maintenance'
export type StoreType = 'Retail' | 'Warehouse' | 'Kiosk' | 'Flagship'

export interface MockStore {
  id: string
  name: string
  address: string
  city: string
  logo: string
  /** Cover / storefront photo */
  image: string
  phone: string
  manager: string
  managerAvatar: string
  type: StoreType
  status: StoreStatus
  hours: string
  staff: number
  registers: number
  monthlySales: string
  openSince: string
}

export const stores: MockStore[] = [
  {
    id: 'main',
    name: 'Main Store',
    address: 'No. 123, Street 456, Phnom Penh',
    city: 'Phnom Penh',
    logo: 'MS',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=500&fit=crop&auto=format',
    phone: '+855 23 123 456',
    manager: 'Sokha Meas',
    managerAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format',
    type: 'Flagship',
    status: 'Open',
    hours: '07:00 – 22:00',
    staff: 18,
    registers: 4,
    monthlySales: '$42,800',
    openSince: '2019',
  },
  {
    id: 'wh',
    name: 'Warehouse A',
    address: 'Industrial Park, Tuol Kork',
    city: 'Phnom Penh',
    logo: 'WA',
    image:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop&auto=format',
    phone: '+855 23 234 567',
    manager: 'Dara Kim',
    managerAvatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&auto=format',
    type: 'Warehouse',
    status: 'Open',
    hours: '06:00 – 18:00',
    staff: 12,
    registers: 1,
    monthlySales: '$8,200',
    openSince: '2021',
  },
  {
    id: 'river',
    name: 'Riverside Branch',
    address: 'Riverside Avenue, Phnom Penh',
    city: 'Phnom Penh',
    logo: 'RB',
    image:
      'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=500&fit=crop&auto=format',
    phone: '+855 23 345 678',
    manager: 'Sreyneang Pich',
    managerAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&auto=format',
    type: 'Retail',
    status: 'Open',
    hours: '08:00 – 21:00',
    staff: 9,
    registers: 2,
    monthlySales: '$19,450',
    openSince: '2022',
  },
  {
    id: 'air',
    name: 'Airport Kiosk',
    address: 'PNH Terminal · Departure hall',
    city: 'Phnom Penh',
    logo: 'AK',
    image:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop&auto=format',
    phone: '+855 23 456 789',
    manager: 'Vannak Chhay',
    managerAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&auto=format',
    type: 'Kiosk',
    status: 'Open',
    hours: '05:00 – 23:00',
    staff: 4,
    registers: 1,
    monthlySales: '$11,900',
    openSince: '2023',
  },
  {
    id: 'sr',
    name: 'Siem Reap Mall',
    address: 'Pub Street, Siem Reap',
    city: 'Siem Reap',
    logo: 'SR',
    image:
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&h=500&fit=crop&auto=format',
    phone: '+855 63 987 654',
    manager: 'Rithy Sok',
    managerAvatar:
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=120&h=120&fit=crop&auto=format',
    type: 'Retail',
    status: 'Maintenance',
    hours: '09:00 – 21:00',
    staff: 7,
    registers: 2,
    monthlySales: '$14,200',
    openSince: '2024',
  },
  {
    id: 'btb',
    name: 'Battambang Outlet',
    address: 'National Road 5, Battambang',
    city: 'Battambang',
    logo: 'BB',
    image:
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=500&fit=crop&auto=format',
    phone: '+855 53 111 222',
    manager: 'Chenda Lim',
    managerAvatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&auto=format',
    type: 'Retail',
    status: 'Closed',
    hours: '08:00 – 20:00',
    staff: 5,
    registers: 1,
    monthlySales: '$6,750',
    openSince: '2024',
  },
]
