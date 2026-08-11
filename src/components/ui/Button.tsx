import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant =
  | 'primary'
  | 'danger'
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
    'min-h-[39px] rounded-[4px] border border-transparent bg-vpos-primary px-4 text-[14px] font-semibold text-white hover:bg-vpos-primary-2 active:bg-vpos-primary-2 disabled:opacity-50',
  danger:
    'min-h-[39px] rounded-[4px] border border-transparent bg-vpos-red px-4 text-[14px] font-semibold text-white hover:bg-vpos-red/90 active:bg-vpos-red/90 disabled:opacity-50',
  dark: 'min-h-[39px] rounded-[4px] border border-transparent bg-vpos-dark px-4 text-[14px] font-semibold text-white hover:bg-vpos-black disabled:opacity-50',
  secondary:
    'min-h-[39px] rounded-[4px] border border-vpos-line bg-white px-4 text-[14px] font-semibold text-vpos-text hover:border-vpos-primary hover:bg-vpos-subtle disabled:opacity-50',
  soft: 'min-h-[39px] rounded-[4px] border border-transparent bg-vpos-sand px-4 text-[14px] font-semibold text-vpos-primary hover:bg-vpos-subtle disabled:opacity-50',
  mini: 'min-h-[30px] rounded-[4px] border border-transparent bg-vpos-subtle px-3 text-[12px] font-semibold text-vpos-primary-2 disabled:opacity-50',
  small:
    'min-h-[34px] rounded-[4px] border border-transparent bg-vpos-primary px-3 text-[12px] font-semibold text-white hover:bg-vpos-primary-2 disabled:opacity-50',
  text: 'border-0 bg-transparent p-0 text-[13px] font-semibold text-vpos-primary hover:underline',
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
        'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary disabled:cursor-not-allowed disabled:shadow-none',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
