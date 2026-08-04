export interface ProductUnitReference {
  id: string
  code: string
  name: string
  productCount: number
  storeCount: number
  status: 'Active' | 'Inactive'
}

export const productUnits: ProductUnitReference[] = [
  { id: 'unit-cup', code: 'CUP', name: 'Cup', productCount: 12, storeCount: 3, status: 'Active' },
  { id: 'unit-piece', code: 'PCS', name: 'Piece', productCount: 5, storeCount: 3, status: 'Active' },
  { id: 'unit-bottle', code: 'BTL', name: 'Bottle', productCount: 3, storeCount: 2, status: 'Active' },
  { id: 'unit-slice', code: 'SLC', name: 'Slice', productCount: 1, storeCount: 2, status: 'Active' },
  { id: 'unit-box', code: 'BOX', name: 'Box', productCount: 1, storeCount: 1, status: 'Active' },
  { id: 'unit-portion', code: 'PRT', name: 'Portion', productCount: 0, storeCount: 1, status: 'Inactive' },
]

export type ProductCategoryTone = 'coffee' | 'tea' | 'bakery' | 'meal' | 'cold' | 'extra'

export interface ProductCategoryReference {
  id: string
  code: string
  name: string
  icon: string
  tone: ProductCategoryTone
  productCount: number
  storeCount: number
  sortOrder: number
  status: 'Active' | 'Inactive'
}

export const productCategories: ProductCategoryReference[] = [
  { id: 'category-coffee', code: 'COF', name: 'Coffee', icon: 'cup-line', tone: 'coffee', productCount: 8, storeCount: 3, sortOrder: 10, status: 'Active' },
  { id: 'category-tea', code: 'TEA', name: 'Tea', icon: 'leaf-line', tone: 'tea', productCount: 4, storeCount: 3, sortOrder: 20, status: 'Active' },
  { id: 'category-bakery', code: 'BAK', name: 'Bakery', icon: 'cake-3-line', tone: 'bakery', productCount: 5, storeCount: 2, sortOrder: 30, status: 'Active' },
  { id: 'category-meals', code: 'MEA', name: 'Meals', icon: 'restaurant-line', tone: 'meal', productCount: 2, storeCount: 2, sortOrder: 40, status: 'Active' },
  { id: 'category-cold', code: 'CLD', name: 'Cold drinks', icon: 'drinks-2-line', tone: 'cold', productCount: 3, storeCount: 3, sortOrder: 50, status: 'Active' },
  { id: 'category-extras', code: 'EXT', name: 'Add-ons', icon: 'add-circle-line', tone: 'extra', productCount: 0, storeCount: 1, sortOrder: 60, status: 'Inactive' },
]
