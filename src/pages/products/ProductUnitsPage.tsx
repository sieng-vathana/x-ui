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
  productUnits,
  type ProductUnitReference,
} from '../../data/product-reference-mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { paths } from '../../lib/paths'
import { pageContent } from '../../lib/ui'

const unitColumns: DataTableColumn<ProductUnitReference>[] = [
  {
    id: 'unit',
    header: 'Unit',
    searchable: (unit) => `${unit.name} ${unit.code}`,
    cell: (unit) => (
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[4px] border border-vpos-primary/15 bg-vpos-sand font-mono text-[12px] font-extrabold tracking-[0.08em] text-vpos-primary">
          {unit.code}
        </span>
        <span>
          <strong className="block text-[14px]">{unit.name}</strong>
          <small className="mt-0.5 block text-[11px] text-vpos-muted">
            Product measurement
          </small>
        </span>
      </div>
    ),
  },
  {
    id: 'code',
    header: 'Code',
    searchable: (unit) => unit.code,
    cell: (unit) => (
      <code className="rounded-[4px] bg-vpos-subtle px-2 py-1 text-[12px] font-bold text-vpos-text">
        {unit.code}
      </code>
    ),
  },
  {
    id: 'products',
    header: 'Products',
    cell: (unit) => <strong>{unit.productCount}</strong>,
  },
  {
    id: 'stores',
    header: 'Stores',
    hideOnMobile: true,
    cell: (unit) => unit.storeCount,
  },
  {
    id: 'status',
    header: 'Status',
    searchable: (unit) => unit.status,
    cell: (unit) => <Status value={unit.status} />,
  },
  {
    id: 'actions',
    header: '',
    cell: (unit) => (
      <Button
        variant="text"
        disabled
        title="Unit actions are coming soon"
        aria-label={`Edit ${unit.name} — coming soon`}
        className="disabled:opacity-45"
      >
        Edit
      </Button>
    ),
  },
]

export function ProductUnitsPage() {
  const { storeId, setStoreId } = useAdminStore()
  const activeUnits = productUnits.filter((unit) => unit.status === 'Active').length
  const assignedProducts = productUnits.reduce((total, unit) => total + unit.productCount, 0)

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Measurement units used across the product catalog"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb
            items={[
              { label: 'Products', to: paths.products },
              { label: 'Units' },
            ]}
          />
          <Button disabled title="Unit creation is coming soon">
            <Icon name="add-line" /> Add unit
          </Button>
        </section>

        <ProductsSubnav />

        <section className="mb-[18px] grid overflow-hidden rounded-[4px] border border-vpos-line bg-white shadow-vpos sm:grid-cols-[1fr_1fr_1.4fr]">
          <ReferenceStat label="Unit types" value={productUnits.length} detail={`${activeUnits} active`} />
          <ReferenceStat label="Product assignments" value={assignedProducts} detail="Across this catalog" />
          <div className="flex items-center gap-3 border-t border-vpos-line bg-vpos-subtle/55 px-5 py-4 sm:border-t-0 sm:border-l">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-white text-vpos-primary shadow-sm">
              <Icon name="information-line" />
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-vpos-muted">
              <strong className="text-vpos-text">Reference view only.</strong> Create, edit, and archive actions will be connected later.
            </p>
          </div>
        </section>

        <DataTable
          data={productUnits}
          columns={unitColumns}
          rowKey={(unit) => unit.id}
          title="Product units"
          searchPlaceholder="Search unit name or code…"
          pageSize={10}
          emptyMessage="No product units are configured."
          emptyIcon="ruler-line"
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
