import {
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
        title="Dashboard"
        subtitle="Welcome back — here’s your store at a glance."
        actions={<StoreSwitcher value={storeId} onChange={setStoreId} />}
      />
      <main className={pageContent}>
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="m-0 text-[21px] font-semibold text-vpos-text">
              {greeting.text}, {name}!
            </h2>
            <p className="mt-1 mb-0 text-[15px] text-vpos-muted">
              Here’s what’s happening with your store today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md border border-vpos-line bg-white px-3 text-[13px] font-semibold text-vpos-text shadow-vpos">
              <Icon name="calendar-2-line" className="text-[17px] text-vpos-primary" />
              01 Jan, 2026 – 31 Jan, 2026
            </button>
            <Button variant="soft"><Icon name="add-circle-line" /> Add product</Button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ['Total sales', '$18,420', '+12.4%', 'money-dollar-circle-line', 'positive'],
              ['Net profit', '$6,820', '+8.2%', 'line-chart-line', 'primary'],
              ['Purchases', '$7,460', '−2.1%', 'shopping-cart-2-line', 'warning'],
              ['Expenses', '$2,196', '+4.6%', 'wallet-3-line', 'danger'],
            ] as const
          ).map(([label, value, trend, icon, tone], i) => (
            <MetricCard
              key={label}
              className={`stagger-${i + 1}`}
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
          <article className={cn(card, 'animate-slide-up stagger-5 min-h-[335px] p-[22px]')}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="m-0 text-[17px]">Sales performance</h3>
                <p className="mt-1.5 mb-0 text-[13px] text-vpos-muted">
                  Revenue and expenses • Last 7 days
                </p>
              </div>
              <div className="flex gap-[18px] text-[13px] text-vpos-muted">
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
              className="mt-5 flex h-[240px] items-stretch justify-around gap-3 border-b border-vpos-line bg-[repeating-linear-gradient(transparent_0_48px,rgba(137,161,152,.12)_49px)] pt-[15px]"
              aria-label="Seven day sales chart"
            >
              {salesBars.map((h, i) => (
                <div
                  key={weekDays[i]}
                  className={`animate-slide-up stagger-${i + 1} flex max-w-[72px] flex-1 flex-col items-center justify-end gap-2`}
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
                  <small className="text-[12px] text-vpos-muted">{weekDays[i]}</small>
                </div>
              ))}
            </div>
          </article>

          <article className={cn(card, 'animate-slide-up stagger-6 min-h-[335px] p-[22px]')}>
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <h3 className="m-0 text-[17px]">Low-stock alerts</h3>
                <p className="mt-1.5 mb-0 text-[13px] text-vpos-muted">
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
                  className="grid grid-cols-[42px_1fr_auto] items-center gap-[11px] border-b border-vpos-line/70 py-3 last:border-0"
                >
                  <ProductThumb tone={p.tone} />
                  <span>
                    <strong className="block text-[14px]">{p.name}</strong>
                    <small className="mt-1 block text-[12px] text-vpos-muted">
                      {p.sku}
                    </small>
                  </span>
                  <span
                    className={cn(
                      'inline-flex min-w-[78px] items-center justify-center rounded-full px-2.5 py-1.5 text-[12px] font-extrabold',
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

        <article className={cn(card, 'animate-slide-up stagger-7 mt-[18px] p-[22px]')}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-[17px]">Recent sales</h3>
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
                {recentSales.map((row, i) => (
                  <tr key={row.invoice} className={`animate-fade-in stagger-${(i % 8) + 1}`}>
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
