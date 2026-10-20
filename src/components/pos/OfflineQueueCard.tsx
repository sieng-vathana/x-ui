import { useQuery } from '@tanstack/react-query'
import { fetchOfflineQueue, type DeviceOfflineQueue } from '../../features/pos/offlineQueueApi'
import { useStoresRaw } from '../../features/stores/useStores'
import { formatCurrency } from '../../lib/currency'
import { parseServerTime } from '../../lib/serverTime'
import { card } from '../../lib/ui'
import { Icon } from '../ui/Icon'

const STALE_AFTER_MS = 5 * 60_000

/**
 * Cash sales that POS computers are holding while they are offline, as each computer last reported them.
 * Shown only when something is waiting or needs a check.
 */
export function OfflineQueueCard({ businessId }: { businessId: number }) {
  const storesQuery = useStoresRaw()
  const queueQuery = useQuery({
    queryKey: ['offline-queue', businessId],
    queryFn: () => fetchOfflineQueue(businessId),
    enabled: Boolean(businessId),
    refetchInterval: 30_000,
  })
  const devices = (queueQuery.data ?? []).filter((device) => device.waitingCount > 0 || device.attentionCount > 0)
  if (devices.length === 0) return null
  const storeName = (id: number) => storesQuery.data?.find((store) => Number(store.id) === id)?.name ?? `Store #${id}`

  return (
    <section className={`${card} mb-5 overflow-hidden p-0`} role="status" aria-label="Offline cash sales">
      <header className="flex items-start gap-3 border-b border-vpos-line px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-vpos-orange-bg text-[20px] text-vpos-orange">
          <Icon name="wifi-off-line" />
        </span>
        <div>
          <h2 className="m-0 text-[15px] font-extrabold text-vpos-text">Offline cash sales on POS computers</h2>
          <p className="mt-1 mb-0 text-[12px] leading-5 text-vpos-muted">
            These sales are saved on the computer until its internet returns. They are sent automatically then.
          </p>
        </div>
      </header>
      <ul className="m-0 list-none divide-y divide-vpos-line p-0">
        {devices.map((device) => <DeviceRow key={device.deviceId} device={device} storeName={storeName(device.storeId)} />)}
      </ul>
    </section>
  )
}

function DeviceRow({ device, storeName }: { device: DeviceOfflineQueue; storeName: string }) {
  const reported = parseServerTime(device.reportedAt)
  const stale = Date.now() - reported.getTime() > STALE_AFTER_MS
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[13px] text-vpos-text">
      <div>
        <strong className="block">{storeName}</strong>
        <span className="text-[11px] text-vpos-muted">Computer {device.deviceId.slice(-6)} · last update {reported.toLocaleString()}</span>
        {stale ? <span className="ml-2 text-[11px] font-bold text-vpos-orange">No update for a while. Is the computer on?</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {device.waitingCount > 0 ? (
          <span className="rounded-full bg-vpos-orange-bg px-3 py-1 text-[12px] font-bold text-vpos-orange">
            {device.waitingCount} waiting · {formatCurrency(device.waitingTotal, device.currencyCode)}
          </span>
        ) : null}
        {device.attentionCount > 0 ? (
          <span className="rounded-full bg-vpos-red-bg px-3 py-1 text-[12px] font-bold text-vpos-red">
            {device.attentionCount} need a check
          </span>
        ) : null}
      </div>
    </li>
  )
}
