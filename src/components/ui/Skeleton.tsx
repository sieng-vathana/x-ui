import { cn } from '../../lib/cn'
import { card } from '../../lib/ui'

export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn('block animate-pulse rounded-lg bg-vpos-line/60 dark:bg-vpos-subtle/80', className)}
    />
  )
}

export function TableSkeleton({
  columns = 5,
  rows = 5,
  hasHeader = true,
}: {
  columns?: number
  rows?: number
  hasHeader?: boolean
}) {
  return (
    <div className="w-full space-y-3" aria-busy="true" aria-label="Loading table data">
      {hasHeader ? (
        <div className="flex items-center gap-4 border-b border-vpos-line px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={cn('h-3.5', i === 0 ? 'w-32' : 'w-20')} />
          ))}
        </div>
      ) : null}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-vpos-line/60 px-4 py-3.5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="flex-1">
              {c === 0 ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ) : c === columns - 1 ? (
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              ) : (
                <Skeleton className={cn('h-4', c % 2 === 0 ? 'w-24' : 'w-16')} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      {/* Top Banner Skeleton */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </section>

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(card, 'p-4 space-y-3')}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </section>

      {/* Main Charts & Table Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Chart Skeleton */}
        <div className={cn(card, 'lg:col-span-2 p-5 space-y-4')}>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          <div className="flex h-56 items-end gap-3 pt-4">
            {[45, 65, 30, 80, 55, 90, 70, 40, 85, 60, 75, 95].map((h, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-md"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Top Products / Feed Skeleton */}
        <div className={cn(card, 'p-5 space-y-4')}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="space-y-3.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Orders Table Skeleton */}
      <section className={cn(card, 'p-5 space-y-4')}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <TableSkeleton columns={5} rows={4} />
      </section>
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(card, 'p-5 space-y-4', className)} aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-4 w-[60%]" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6" aria-busy="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, item) => (
          <Skeleton key={item} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className={cn(card, 'p-6 space-y-4')}>
        <TableSkeleton columns={5} rows={5} />
      </div>
    </div>
  )
}
