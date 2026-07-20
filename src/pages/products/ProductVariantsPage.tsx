import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  DataTable,
  Icon,
  MetricCard,
  Status,
  StoreSwitcher,
  Topbar,
  type DataTableColumn,
} from '../../components'
import { ProductsSubnav } from '../../components/products/ProductsSubnav'
import {
  productOptionTypes,
  type ProductOptionType,
} from '../../data/mockup'
import { useAdminStore } from '../../hooks/useAdminStore'
import { paths } from '../../lib/paths'
import { pageContent, selectClass } from '../../lib/ui'

/**
 * Variants = option templates for “create product with variants”.
 * e.g. Size (S,M,L), Color (Black, White) — NOT sellable SKUs, no stock.
 */
export function ProductVariantsPage() {
  const navigate = useNavigate()
  const { storeId, setStoreId } = useAdminStore()
  const [status, setStatus] = useState('All status')

  const rows = useMemo(() => {
    if (status === 'All status') return productOptionTypes
    return productOptionTypes.filter((o) => o.status === status)
  }, [status])

  const active = productOptionTypes.filter((o) => o.status === 'Active').length

  const columns: DataTableColumn<ProductOptionType>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Option name',
        searchable: (o) => o.name,
        cell: (o) => (
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-vpos-sand text-vpos-primary">
              <Icon name="list-settings-line" />
            </span>
            <strong className="text-[13px]">{o.name}</strong>
          </div>
        ),
      },
      {
        id: 'values',
        header: 'Values',
        searchable: (o) => o.values.join(' '),
        cell: (o) => (
          <div className="flex flex-wrap gap-1">
            {o.values.map((v) => (
              <span
                key={v}
                className="inline-flex rounded-full border border-vpos-line bg-vpos-subtle px-2.5 py-0.5 text-[11px] font-bold text-vpos-text"
              >
                {v}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: 'used',
        header: 'Used on products',
        hideOnMobile: true,
        cell: (o) => o.usedOnProducts,
      },
      {
        id: 'status',
        header: 'Status',
        searchable: (o) => o.status,
        cell: (o) => <Status value={o.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: () => <Button variant="text">Edit</Button>,
      },
    ],
    [],
  )

  return (
    <>
      <Topbar
        title="Products"
        subtitle="Option types for products with variants — Size, Color, etc. (not stock items)"
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-5 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumb
              items={[
                { label: 'Products', to: paths.products },
                { label: 'Variants' },
              ]}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button
              variant="secondary"
              onClick={() => navigate(paths.productNew)}
            >
              <Icon name="add-line" /> New product
            </Button>
            <Button variant="primary">
              <Icon name="add-line" /> Add option
            </Button>
          </div>
        </section>

        <ProductsSubnav />

        <div className="mb-4 rounded-[12px] border border-vpos-line bg-vpos-subtle/60 px-4 py-3 text-[12px] leading-relaxed text-vpos-muted">
          <strong className="text-vpos-text">What this is: </strong>
          reusable <strong className="text-vpos-text">options</strong> (Size,
          Color, Milk…) you attach when creating a product of type{' '}
          <em>With variants</em>.
          <br />
          <strong className="text-vpos-text">What this is not: </strong>
          not products, not SKUs, not inventory. Stock lives on the product’s
          generated combinations after you save the product — not here.
        </div>

        <section className="mb-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          <MetricCard
            label="Option types"
            value={String(productOptionTypes.length)}
            trend="Size, Color, …"
            trendAs="small"
            icon={<Icon name="list-settings-line" />}
            iconTone="primary"
          />
          <MetricCard
            label="Active"
            value={String(active)}
            trend="Available when creating a product"
            trendAs="small"
            icon={<Icon name="checkbox-circle-line" />}
            iconTone="positive"
          />
        </section>

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(o) => o.id}
          title="Variant options"
          searchPlaceholder="Search option name or value…"
          pageSize={10}
          emptyMessage="No options yet. Add Size, Color, etc."
          toolbar={
            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>All status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          }
        />
      </main>
    </>
  )
}
