import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'

type Op = '+' | '-' | '*' | '/' | null

function formatDisplay(value: string): string {
  if (value === '' || value === '-') return value || '0'
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  // Keep typing decimals as-is when trailing .
  if (value.endsWith('.')) return value
  if (value.includes('.')) {
    const [a, b = ''] = value.split('.')
    return `${Number(a).toLocaleString('en-US')}.${b}`
  }
  return n.toLocaleString('en-US')
}

export function Calculator() {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [op, setOp] = useState<Op>(null)
  const [fresh, setFresh] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const inputDigit = (d: string) => {
    setDisplay((prev) => {
      if (fresh || prev === '0') {
        setFresh(false)
        return d
      }
      if (prev.replace('.', '').length >= 12) return prev
      return prev + d
    })
  }

  const inputDot = () => {
    setDisplay((prev) => {
      if (fresh) {
        setFresh(false)
        return '0.'
      }
      if (prev.includes('.')) return prev
      return `${prev}.`
    })
  }

  const clearAll = () => {
    setDisplay('0')
    setStored(null)
    setOp(null)
    setFresh(true)
  }

  const applyOp = (next: Op) => {
    const current = Number(display)
    if (stored != null && op && !fresh) {
      const result = compute(stored, current, op)
      setStored(result)
      setDisplay(String(result))
    } else {
      setStored(current)
    }
    setOp(next)
    setFresh(true)
  }

  const equals = () => {
    if (stored == null || !op) return
    const current = Number(display)
    const result = compute(stored, current, op)
    setDisplay(String(result))
    setStored(null)
    setOp(null)
    setFresh(true)
  }

  const backspace = () => {
    if (fresh) return
    setDisplay((prev) => {
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))) {
        setFresh(true)
        return '0'
      }
      return prev.slice(0, -1)
    })
  }

  const toggleSign = () => {
    setDisplay((prev) => {
      if (prev === '0') return prev
      return prev.startsWith('-') ? prev.slice(1) : `-${prev}`
    })
    setFresh(false)
  }

  const percent = () => {
    setDisplay((prev) => String(Number(prev) / 100))
    setFresh(true)
  }

  const keys: Array<{ label: string; onClick: () => void; className?: string }> =
    [
      { label: 'C', onClick: clearAll, className: 'text-vpos-red' },
      { label: '±', onClick: toggleSign },
      { label: '%', onClick: percent },
      { label: '÷', onClick: () => applyOp('/'), className: 'bg-vpos-sand text-vpos-primary' },
      { label: '7', onClick: () => inputDigit('7') },
      { label: '8', onClick: () => inputDigit('8') },
      { label: '9', onClick: () => inputDigit('9') },
      { label: '×', onClick: () => applyOp('*'), className: 'bg-vpos-sand text-vpos-primary' },
      { label: '4', onClick: () => inputDigit('4') },
      { label: '5', onClick: () => inputDigit('5') },
      { label: '6', onClick: () => inputDigit('6') },
      { label: '−', onClick: () => applyOp('-'), className: 'bg-vpos-sand text-vpos-primary' },
      { label: '1', onClick: () => inputDigit('1') },
      { label: '2', onClick: () => inputDigit('2') },
      { label: '3', onClick: () => inputDigit('3') },
      { label: '+', onClick: () => applyOp('+'), className: 'bg-vpos-sand text-vpos-primary' },
      { label: '⌫', onClick: backspace },
      { label: '0', onClick: () => inputDigit('0') },
      { label: '.', onClick: inputDot },
      {
        label: '=',
        onClick: equals,
        className: 'bg-vpos-primary text-white',
      },
    ]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Calculator"
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] border border-vpos-line bg-white px-3.5 text-[13px] font-bold text-vpos-text transition-colors hover:bg-vpos-subtle',
          open && 'border-vpos-primary bg-vpos-sand text-vpos-primary',
        )}
      >
        <Icon name="calculator-line" className="text-[17px]" />
        Calculator
      </button>

      {open ? (
        <div className="popover-in absolute top-[calc(100%+8px)] right-0 z-[300] w-[260px] overflow-hidden rounded-xl border border-vpos-line bg-white p-3 shadow-[0_14px_36px_rgba(12,43,78,.16)]">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[12px] font-bold text-vpos-muted">Calculator</span>
            <button
              type="button"
              aria-label="Close calculator"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg border-0 bg-vpos-subtle text-vpos-muted hover:text-vpos-text"
            >
              <Icon name="close-line" />
            </button>
          </div>
          <div className="mb-3 rounded-lg bg-vpos-subtle px-3 py-3 text-right">
            <div className="min-h-[1.25rem] text-[12px] text-vpos-muted">
              {stored != null && op
                ? `${stored} ${op === '*' ? '×' : op === '/' ? '÷' : op}`
                : '\u00a0'}
            </div>
            <div className="truncate text-[23px] font-extrabold tracking-tight text-vpos-text">
              {formatDisplay(display)}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {keys.map((k) => (
              <button
                key={k.label}
                type="button"
                onClick={k.onClick}
                className={cn(
                  'h-11 rounded-lg border-0 bg-vpos-subtle text-[15px] font-bold text-vpos-text transition-colors hover:bg-vpos-primary-soft',
                  k.className,
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function compute(a: number, b: number, op: Op): number {
  if (!op) return b
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '*':
      return a * b
    case '/':
      return b === 0 ? 0 : a / b
    default:
      return b
  }
}
