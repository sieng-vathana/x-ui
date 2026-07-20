import {
  Breadcrumb,
  Button,
  Icon,
  MetricCard,
  ProductThumb,
  Status,
  StoreSwitcher,
  Topbar,
} from '../components'
import {
  expenseBars,
  products as catalog,
  recentSales,
  salesBars,
  weekDays,
} from '../data/mockup'
import { useAdminStore } from '../hooks/useAdminStore'
import { cn } from '../lib/cn'
import { firstName, getGreeting } from '../lib/greeting'
import { card, pageContent, thClass, tdClass } from '../lib/ui'

export function DashboardPage() {
  const { storeId, setStoreId } = useAdminStore()
  const greeting = getGreeting()
  const name = firstName('Vathana Sieng')

  return (
    <>
      <Topbar
        title={
          <span className="inline-flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-vpos-sand text-[18px] text-vpos-primary">
              <Icon name={greeting.icon} />
            </span>
            {greeting.text}, {name}
          </span>
        }
        subtitle="Here’s what’s happening across your business today."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-6">
          <Breadcrumb items={[{ label: 'Overview' }]} />
        </section>

        <section className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ['Total sales', '$18,420', '+12.4%', 'money-dollar-circle-line', 'positive'],
              ['Net profit', '$6,820', '+8.2%', 'line-chart-line', 'primary'],
              ['Purchases', '$7,460', '−2.1%', 'shopping-cart-2-line', 'warning'],
              ['Expenses', '$2,196', '+4.6%', 'wallet-3-line', 'danger'],
            ] as const
          ).map(([label, value, trend, icon, tone]) => (
            <MetricCard
              key={label}
              label={label}
              value={value}
              trend={trend}
              trendTone={tone}
              icon={<Icon name={icon} />}
              iconTone={tone}
            />
          ))}
        </section>

        <section className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.8fr)_minmax(330px,0.9fr)]">
          <article className={cn(card, 'min-h-[335px] p-[22px]')}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="m-0 text-[16px]">Sales performance</h3>
                <p className="mt-1.5 mb-0 text-[12px] text-vpos-muted">
                  Revenue and expenses • Last 7 days
                </p>
              </div>
              <div className="flex gap-[18px] text-[12px] text-vpos-muted">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2 w-2 rounded-full bg-vpos-primary" />
                  Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2 w-2 rounded-full bg-vpos-accent" />
                  Expenses
                </span>
              </div>
            </div>
            <div
              className="mt-5 flex h-[240px] items-stretch justify-around gap-3 border-b border-vpos-line bg-[repeating-linear-gradient(transparent_0_48px,#ededf1_49px)] pt-[15px]"
              aria-label="Seven day sales chart"
            >
              {salesBars.map((h, i) => (
                <div
                  key={weekDays[i]}
                  className="flex max-w-[72px] flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-[190px] items-end gap-1">
                    <span
                      className="block min-h-1 w-[19px] rounded-t-md bg-vpos-primary"
                      style={{ height: `${h}%` }}
                    />
                    <span
                      className="block min-h-1 w-[11px] rounded-t-md bg-vpos-accent"
                      style={{ height: `${expenseBars[i]}%` }}
                    />
                  </div>
                  <small className="text-[11px] text-vpos-muted">{weekDays[i]}</small>
                </div>
              ))}
            </div>
          </article>

          <article className={cn(card, 'min-h-[335px] p-[22px]')}>
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <h3 className="m-0 text-[16px]">Low-stock alerts</h3>
                <p className="mt-1.5 mb-0 text-[12px] text-vpos-muted">
                  Items that need attention
                </p>
              </div>
              <Button variant="text">View all</Button>
            </div>
            {catalog
              .filter((p) => p.stock <= 12)
              .slice(0, 4)
              .map((p) => (
                <div
                  key={p.sku}
                  className="grid grid-cols-[42px_1fr_auto] items-center gap-[11px] border-b border-[#eeeef1] py-3 last:border-0"
                >
                  <ProductThumb tone={p.tone} />
                  <span>
                    <strong className="block text-[13px]">{p.name}</strong>
                    <small className="mt-1 block text-[11px] text-vpos-muted">
                      {p.sku}
                    </small>
                  </span>
                  <span
                    className={cn(
                      'inline-flex min-w-[78px] items-center justify-center rounded-full px-2.5 py-1.5 text-[11px] font-extrabold',
                      p.stock === 0
                        ? 'bg-vpos-red-bg text-vpos-red'
                        : 'bg-vpos-orange-bg text-vpos-orange',
                    )}
                  >
                    {p.stock === 0 ? 'Out' : `${p.stock} left`}
                  </span>
                </div>
              ))}
          </article>
        </section>

        <article className={cn(card, 'mt-[18px] p-[22px]')}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-[16px]">Recent sales</h3>
            <Button variant="text">View all sales</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Invoice', 'Customer', 'Cashier', 'Payment', 'Total', 'Status'].map(
                    (h) => (
                      <th key={h} className={thClass}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {recentSales.map((row) => (
                  <tr key={row.invoice}>
                    <td className={cn(tdClass, 'font-bold text-vpos-primary-2')}>
                      {row.invoice}
                    </td>
                    <td className={tdClass}>{row.customer}</td>
                    <td className={tdClass}>{row.cashier}</td>
                    <td className={tdClass}>{row.payment}</td>
                    <td className={tdClass}>{row.total}</td>
                    <td className={tdClass}>
                      <Status value={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </main>
    </>
  )
}
