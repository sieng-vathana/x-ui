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
 * Keyboard shortcut details dialog using the shared light dialog surface.
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
      tone="light"
      size="shortcut"
      contained={contained}
      title="Shortcut Details"
      className={className}
      footer={
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'rounded-[4px] border border-vpos-line bg-white px-4 py-2',
            'text-[14px] font-semibold text-vpos-text',
            'transition-all duration-200 hover:bg-vpos-subtle hover:border-vpos-primary',
            'active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary',
          )}
        >
          Close
        </button>
      }
    >
      <div className="overflow-hidden rounded-[4px] border border-vpos-line bg-white">
        {/* Column headers */}
        <div className="flex items-center border-b border-vpos-line bg-vpos-subtle px-4 py-2.5">
          <span className="w-[min(75%,1fr)] flex-1 text-[12px] font-semibold tracking-wide text-vpos-muted uppercase">
            Action
          </span>
          <span className="w-[28%] shrink-0 text-right text-[12px] font-semibold tracking-wide text-vpos-muted uppercase">
            Shortcuts
          </span>
        </div>

        <ul className="m-0 list-none p-0" role="list">
          {rows.map((row, idx) => (
            <li
              key={row.action}
              className={cn(
                'group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150',
                'hover:bg-vpos-subtle',
                idx < rows.length - 1 && 'border-b border-vpos-line/60',
                open && 'modal-stagger-in',
              )}
              style={{ animationDelay: `${48 + idx * 30}ms` }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-vpos-text transition-colors group-hover:text-vpos-primary">
                  {row.action}
                </div>
                <div className="mt-0.5 text-[13px] leading-snug text-vpos-muted">
                  {row.description}
                </div>
              </div>
              <div className="flex w-[28%] shrink-0 justify-end">
                <ShortcutKeys shortcut={row.shortcut} tone="light" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
