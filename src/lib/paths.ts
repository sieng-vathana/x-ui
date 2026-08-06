/** App URL paths */
export const paths = {
  home: '/',
  dashboard: '/',
  pos: '/pos',
  products: '/products',
  productNew: '/products/new',
  productDetail: (id: string | number) => `/products/${encodeURIComponent(id)}`,
  productEdit: (id: string | number) => `/products/${encodeURIComponent(id)}/edit`,
  productUnits: '/products/units',
  productCategories: '/products/categories',
  productOptions: '/products/options',
  productStockMovement: '/products/stock-movement',
  productLowStock: '/products/low-stock',
  /** @deprecated use product stock pages under Products */
  inventory: '/products/low-stock',
  stores: '/stores',
  sales: '/sales',
  purchases: '/purchases',
  purchaseReceive: '/purchases/receive',
  purchaseSuppliers: '/purchases/suppliers',
  purchaseReturns: '/purchases/returns',
  purchaseOrderNew: '/purchases/orders/new',
  purchaseOrder: (id: string) => `/purchases/orders/${encodeURIComponent(id)}`,
  customers: '/customers',
  reports: '/reports',
  settings: '/settings',
  users: '/users',
} as const

/** Map nav keys → paths */
export const navPaths: Record<string, string> = {
  dashboard: paths.dashboard,
  pos: paths.pos,
  products: paths.products,
  stores: paths.stores,
  sales: paths.sales,
  purchases: paths.purchases,
  customers: paths.customers,
  reports: paths.reports,
  settings: paths.settings,
  users: paths.users,
}
