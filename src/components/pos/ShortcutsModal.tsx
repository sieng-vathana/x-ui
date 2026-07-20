import { Modal } from '../ui/Modal'
import { ShortcutKeys } from '../ui/Kbd'
import { cn } from '../../lib/cn'

export interface ShortcutRow {
  action: string
  description: string
  /** Display string e.g. "CTRL+K" or "ALT+Q" */
  shortcut: string
}

/** Rows from Shortcut Details modal JSON */
export const POS_SHORTCUT_ROWS: ShortcutRow[] = [
  {
    action: 'Global Search',
    description: 'Open the global search palette',
    shortcut: 'CTRL+K',
  },
  {
    action: 'Focus Search',
    description: 'Focus the search bar',
    shortcut: 'F',
  },
  {
    action: 'Pay Now',
    description: 'Place an order',
    shortcut: 'ALT+P',
  },
  {
    action: 'Hold List',
    description: 'Open the hold list',
    shortcut: 'ALT+H',
  },
  {
    action: 'Order List',
    description: 'Open the order list',
    shortcut: 'ALT+O',
  },
  {
    action: 'Reset',
    description: 'Reset the current order',
    shortcut: 'ALT+R',
  },
  {
    action: 'Select QR Payment',
    description: 'Select QR payment method',
    shortcut: 'ALT+Q',
  },
  {
    action: 'Select Cash Payment',
    description: 'Select cash payment method',
    shortcut: 'ALT+C',
  },
]

export interface ShortcutsModalProps {
  open: boolean
  onClose: () => void
  rows?: ShortcutRow[]
  /**
   * When true, overlay is absolute within a relative parent (POS content).
   * Matches JSON: backdrop covers POS content, excludes left nav.
   */
  contained?: boolean
  className?: string
}

/**
 * Keyboard shortcut details dialog — dark FinPOS-style panel with animations.
 */
export function ShortcutsModal({
  open,
  onClose,
  rows = POS_SHORTCUT_ROWS,
  contained = true,
  className,
}: ShortcutsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="dark"
      size="shortcut"
      contained={contained}
      title="Shortcut Details"
      className={className}
      footer={
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'rounded-[9px] border border-[#34435C] bg-[#1B2639] px-4 py-2',
            'text-[13px] font-semibold text-[#F4F6FA]',
            'transition-all duration-200 hover:bg-[#243247] hover:border-[#445572]',
            'active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B7C99]',
          )}
        >
          Close
        </button>
      }
    >
      <div className="overflow-hidden rounded-[10px] border border-[#2D394E] bg-[#111827]">
        {/* Column headers */}
        <div className="flex items-center border-b border-[#2D394E] bg-[#0E1522] px-4 py-2.5">
          <span className="w-[min(75%,1fr)] flex-1 text-[11px] font-semibold tracking-wide text-[#91A0B8] uppercase">
            Action
          </span>
          <span className="w-[28%] shrink-0 text-right text-[11px] font-semibold tracking-wide text-[#91A0B8] uppercase">
            Shortcuts
          </span>
        </div>

        <ul className="m-0 list-none p-0" role="list">
          {rows.map((row, idx) => (
            <li
              key={row.action}
              className={cn(
                'group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150',
                'hover:bg-[#161F30]',
                idx < rows.length - 1 && 'border-b border-[#2D394E]/60',
                open && 'modal-stagger-in',
              )}
              style={{ animationDelay: `${48 + idx * 30}ms` }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[#F4F6FA] transition-colors group-hover:text-white">
                  {row.action}
                </div>
                <div className="mt-0.5 text-[12px] leading-snug text-[#91A0B8]">
                  {row.description}
                </div>
              </div>
              <div className="flex w-[28%] shrink-0 justify-end">
                <ShortcutKeys shortcut={row.shortcut} tone="dark" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
