import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant =
  | 'primary'
  | 'dark'
  | 'secondary'
  | 'soft'
  | 'mini'
  | 'small'
  | 'text'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'min-h-[42px] rounded-[10px] border border-transparent bg-vpos-primary px-[18px] text-[13px] font-[750] text-white hover:bg-vpos-dark disabled:opacity-50',
  dark: 'min-h-[42px] rounded-[10px] border border-transparent bg-vpos-dark px-[18px] text-[13px] font-[750] text-white hover:bg-vpos-black disabled:opacity-50',
  secondary:
    'min-h-[42px] rounded-[10px] border border-vpos-line bg-white px-[18px] text-[13px] font-[750] text-vpos-text hover:bg-vpos-subtle disabled:opacity-50',
  soft: 'min-h-[42px] rounded-[10px] border border-transparent bg-vpos-sand px-[18px] text-[13px] font-[750] text-vpos-dark hover:bg-[#dce5ec] disabled:opacity-50',
  mini: 'min-h-[30px] rounded-[10px] border border-transparent bg-[#e0e7ed] px-[17px] text-[11px] font-[750] text-vpos-dark disabled:opacity-50',
  small:
    'min-h-[34px] rounded-[10px] border border-transparent bg-vpos-primary px-[13px] text-[11px] font-[750] text-white hover:bg-vpos-dark disabled:opacity-50',
  text: 'border-0 bg-transparent p-0 text-[12px] font-extrabold text-vpos-primary hover:underline',
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
