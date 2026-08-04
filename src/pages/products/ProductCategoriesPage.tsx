import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import {
  productCategories,
  type ProductCategoryReference,
  type ProductCategoryTone,
} from '../../data/product-reference-mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

const categoryToneClasses: Record<ProductCategoryTone, string> = {
  coffee: 'bg-[#efe4d4] text-[#7a4a21]',
  tea: 'bg-[#e0eee4] text-[#327044]',
  bakery: 'bg-[#f8e8da] text-[#a25727]',
  meal: 'bg-[#f5e4e5] text-[#9a424b]',
  cold: 'bg-[#e0edf5] text-[#336b8c]',
  extra: 'bg-vpos-subtle text-vpos-muted',
}

const categoryColumns: DataTableColumn<ProductCategoryReference>[] = [
  {
    id: 'category',
    header: 'Category',
    searchable: (category) => `${category.name} ${category.code}`,
    cell: (category) => (
      <div className="flex items-center gap-3">
        <span className={cn('grid h-10 w-10 place-items-center rounded-[4px] text-[19px]', categoryToneClasses[category.tone])}>
          <Icon name={category.icon} />
        </span>
        <span>
          <strong className="block text-[14px]">{category.name}</strong>
          <small className="mt-0.5 block font-mono text-[11px] font-bold tracking-[0.06em] text-vpos-muted">
            {category.code}
          </small>
        </span>
      </div>
    ),
  },
  {
    id: 'products',
    header: 'Products',
    cell: (category) => <strong>{category.productCount}</strong>,
  },
  {
    id: 'stores',
    header: 'Stores',
    hideOnMobile: true,
    cell: (category) => category.storeCount,
  },
  {
    id: 'sort',
    header: 'Sort order',
    hideOnMobile: true,
    cell: (category) => (
      <span className="inline-flex min-w-8 justify-center rounded-[4px] border border-vpos-line bg-white px-2 py-1 font-mono text-[12px] font-bold">
        {category.sortOrder}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    searchable: (category) => category.status,
    cell: (category) => <Status value={category.status} />,
  },
  {
    id: 'actions',
    header: '',
    cell: (category) => (
      <Button
        variant="text"
        disabled
        title="Category actions are coming soon"
        aria-label={`Edit ${category.name} — coming soon`}
        className="disabled:opacity-45"
      >
        Edit
      </Button>
    ),
  },
]

export function ProductCategoriesPage() {
  const { storeId, setStoreId } = useAdminStore()
  const activeCategories = productCategories.filter((category) => category.status === 'Active').length
  const assignedProducts = productCategories.reduce((total, category) => total + category.productCount, 0)

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Categories that organize products across storefronts and reports"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Products', to: paths.products },
              { label: 'Categories' },
            ]}
          />
          <Button disabled title="Category creation is coming soon">
            <Icon name="add-line" /> Add category
          </Button>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid overflow-hidden rounded-[4px] border border-vpos-line bg-white shadow-vpos sm:grid-cols-[1fr_1fr_1.4fr]">
          <ReferenceStat label="Categories" value={productCategories.length} detail={`${activeCategories} active`} />
          <ReferenceStat label="Product placements" value={assignedProducts} detail="Across this catalog" />
          <div className="flex items-center gap-3 border-t border-vpos-line bg-vpos-subtle/55 px-5 py-4 sm:border-t-0 sm:border-l">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-white text-vpos-primary shadow-sm">
              <Icon name="information-line" />
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-vpos-muted">
              <strong className="text-vpos-text">Reference view only.</strong> Create, edit, reorder, and archive actions will be connected later.
            </p>
          </div>
        </section>

        <DataTable
          data={productCategories}
          columns={categoryColumns}
          rowKey={(category) => category.id}
          title="Product categories"
          searchPlaceholder="Search category name or code…"
          pageSize={10}
          emptyMessage="No product categories are configured."
          emptyIcon="folder-open-line"
        />
      </main>
    </>
  )
}

function ReferenceStat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border-b border-vpos-line px-5 py-4 last:border-b-0 sm:border-r sm:border-b-0">
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-vpos-muted">{label}</span>
      <div className="mt-1.5 flex items-baseline gap-2">
        <strong className="text-[25px] tracking-[-0.04em] text-vpos-text">{value}</strong>
        <small className="text-[12px] font-semibold text-vpos-muted">{detail}</small>
      </div>
    </div>
  )
}
