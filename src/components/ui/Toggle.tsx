import { useState, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  description?: string
}

export function Toggle({
  checked,
  defaultChecked = false,
  onChange,
  label,
  description,
  className,
  disabled,
  ...rest
}: ToggleProps) {
  const controlled = checked !== undefined
  const [inner, setInner] = useState(defaultChecked)
  const on = controlled ? Boolean(checked) : inner

  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      className={cn(
        'h-6 w-11 shrink-0 rounded-full border-0 p-[3px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary disabled:cursor-not-allowed disabled:opacity-50',
        on ? 'bg-vpos-primary' : 'bg-[#c8c8d1]',
        !label && className,
      )}
      onClick={() => {
        if (disabled) return
        const next = !on
        if (!controlled) setInner(next)
        onChange?.(next)
      }}
      {...rest}
    >
      <i
        className={cn(
          'block h-[18px] w-[18px] rounded-full bg-white transition-transform duration-200',
          on && 'translate-x-5',
        )}
        aria-hidden
      />
    </button>
  )

  if (!label) return switchEl

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-2.5',
        className,
      )}
    >
      <span>
        <strong className="block text-[13px] font-bold text-vpos-text">
          {label}
        </strong>
        {description ? (
          <small className="mt-1 block text-[11px] text-vpos-muted">
            {description}
          </small>
        ) : null}
      </span>
      {switchEl}
    </div>
  )
}
