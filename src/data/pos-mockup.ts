/** FinPOS Point of Sale mock data */

export interface PosCategory {
  id: string
  name: string
  count: number
  status: 'Available' | 'Restock'
  image: string
}

export interface PosProduct {
  id: string
  name: string
  variant: string
  price: number
  oldPrice?: number
  image: string
  categoryId: string
  badge?: string
}

export const posStore = {
  name: 'អាហារដ្ឋាន ត្រជាក់',
  logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=80&h=80&fit=crop&auto=format',
}

export const posCategories: PosCategory[] = [
  {
    id: 'all',
    name: 'All Products',
    count: 10,
    status: 'Available',
    image:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop&auto=format',
  },
  {
    id: 'food',
    name: 'Food & Beverage',
    count: 4,
    status: 'Restock',
    image:
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=200&h=200&fit=crop&auto=format',
  },
  {
    id: 'electronic',
    name: 'Electronic & Accessories',
    count: 2,
    status: 'Restock',
    image:
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop&auto=format',
  },
  {
    id: 'ingredient',
    name: 'Ingrediant',
    count: 2,
    status: 'Restock',
    image:
      'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=200&h=200&fit=crop&auto=format',
  },
  {
    id: 'computer',
    name: 'Computer & Accessories',
    count: 1,
    status: 'Restock',
    image:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&h=200&fit=crop&auto=format',
  },
]

export const posProducts: PosProduct[] = [
  {
    id: 'p1',
    name: 'Pepper',
    variant: 'Standard',
    price: 60000,
    image:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop&auto=format',
    categoryId: 'ingredient',
    badge: 'Tier Discount',
  },
  {
    id: 'p2',
    name: 'KOHOU',
    variant: '4GB',
    price: 10,
    oldPrice: 33,
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format',
    categoryId: 'electronic',
    badge: 'Tier Discount',
  },
  {
    id: 'p3',
    name: 'Hoodie',
    variant: 'black',
    price: 9.5,
    image:
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&auto=format',
    categoryId: 'food',
    badge: 'Tier Discount',
  },
  {
    id: 'p4',
    name: 'Hoodie',
    variant: 'white',
    price: 9.5,
    image:
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop&auto=format',
    categoryId: 'food',
    badge: 'Tier Discount',
  },
  {
    id: 'p5',
    name: 'គីវី (កាត់ជាពីរ)',
    variant: 'Standard',
    price: 3,
    oldPrice: 5,
    image:
      'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=400&h=400&fit=crop&auto=format',
    categoryId: 'food',
  },
  {
    id: 'p6',
    name: 'ផ្លែឡុងកុង',
    variant: '1',
    price: 1.5,
    image:
      'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&h=400&fit=crop&auto=format',
    categoryId: 'food',
  },
  {
    id: 'p7',
    name: 'Spicy Peper',
    variant: 'Standard',
    price: 10000,
    image:
      'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400&h=400&fit=crop&auto=format',
    categoryId: 'ingredient',
  },
  {
    id: 'p8',
    name: 'ផ្លែប៉ោមក្រហម',
    variant: 'Standard',
    price: 2.5,
    oldPrice: 5,
    image:
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop&auto=format',
    categoryId: 'food',
  },
  {
    id: 'p9',
    name: 'Red Onion',
    variant: 'Standard',
    price: 7000,
    image:
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=400&fit=crop&auto=format',
    categoryId: 'ingredient',
  },
  {
    id: 'p10',
    name: 'Beauty',
    variant: 'Standard',
    price: 100,
    image:
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop&auto=format',
    categoryId: 'electronic',
    badge: 'Tier Discount',
  },
]

export function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

export function formatKhr(usd: number, rate = 4000): string {
  const khr = Math.round(usd * rate)
  return `៛${khr.toLocaleString('en-US')}`
}
