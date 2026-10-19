/** Plain names for permission codes and their sections, so staff never need to read a code like x-order:refund. */
const PERMISSION_NAMES: Record<string, string> = {
  'x-bff:read': 'Open the portal',

  'x-business:create': 'Create a business',
  'x-business:read': 'View business settings',
  'x-business:update': 'Change business settings',
  'x-business:delete': 'Delete the business',

  'x-store:create': 'Add stores',
  'x-store:read': 'View stores',
  'x-store:update': 'Edit stores',
  'x-store:delete': 'Delete stores',

  'x-product:create': 'Add products',
  'x-product:read': 'View products',
  'x-product:update': 'Edit products and prices',
  'x-product:delete': 'Delete products',
  'x-product:category': 'Manage categories',
  'x-product:brand': 'Manage brands',
  'x-product:unit': 'Manage units',
  'x-product:tax': 'Manage tax rates',

  'x-inventory:create': 'Add stock records',
  'x-inventory:read': 'View stock',
  'x-inventory:update': 'Edit stock records',
  'x-inventory:delete': 'Delete stock records',
  'x-inventory:reserve': 'Hold stock for orders',
  'x-inventory:stock-in': 'Receive stock',
  'x-inventory:stock-out': 'Remove stock',

  'x-order:create': 'Make sales',
  'x-order:read': 'View sales and orders',
  'x-order:update': 'Edit orders',
  'x-order:cancel': 'Cancel orders',
  'x-order:refund': 'Refund orders',
  'x-order:delete': 'Delete orders',

  'x-payment:create': 'Take payments',
  'x-payment:read': 'View payments',
  'x-payment:update': 'Edit payments',
  'x-payment:capture': 'Confirm payments',
  'x-payment:refund': 'Refund payments',
  'x-payment:delete': 'Delete payments',

  'x-customer:create': 'Add customers',
  'x-customer:read': 'View customers',
  'x-customer:update': 'Edit customers',
  'x-customer:delete': 'Delete customers',

  'x-delivery:create': 'Book deliveries',
  'x-delivery:read': 'View deliveries',
  'x-delivery:update': 'Update deliveries',
  'x-delivery:delete': 'Delete deliveries',
  'x-delivery:quote': 'Get delivery prices',
  'x-delivery:remit': 'Record cash-on-delivery money',

  'x-report:read': 'View reports',

  'x-storage:create': 'Add files',
  'x-storage:upload': 'Upload images',
  'x-storage:read': 'View images and files',
  'x-storage:update': 'Replace files',
  'x-storage:delete': 'Delete files',

  'x-user:create': 'Add staff',
  'x-user:read': 'View staff',
  'x-user:update': 'Edit staff and roles',
  'x-user:delete': 'Remove staff',
}

const SECTION_NAMES: Record<string, string> = {
  bff: 'Portal access',
  business: 'Business',
  store: 'Stores',
  product: 'Products',
  inventory: 'Stock',
  order: 'Sales & orders',
  payment: 'Payments',
  customer: 'Customers',
  delivery: 'Deliveries',
  report: 'Reports',
  storage: 'Images & files',
  user: 'Staff',
}

/** "x-order:refund" → "Refund orders"; an unknown code still reads as words, not a code. */
export function permissionLabel(code: string, fallbackName?: string | null) {
  const known = PERMISSION_NAMES[code]
  if (known) return known
  if (fallbackName && !fallbackName.includes(':')) return fallbackName
  const [, action = code] = code.split(':')
  const words = action.replace(/[-_]/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The section a permission belongs to, from its module name ("ORDER") or code ("x-order:read"). */
export function permissionSection(moduleOrCode: string) {
  const key = moduleOrCode.toLowerCase().replace(/^x-/, '').split(':')[0]
  return SECTION_NAMES[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}
