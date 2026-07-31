import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-lg bg-vpos-line/70', className)}
    />
  )
}

export function PageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1180px] p-6">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-32" />)}
      </div>
    </main>
  )
}
