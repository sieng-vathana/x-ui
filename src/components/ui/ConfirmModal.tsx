import type { ReactNode } from 'react'
import { Button, type ButtonVariant } from './Button'
import { Icon } from './Icon'
import { Modal, type ModalSize } from './Modal'
import { cn } from '../../lib/cn'

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success'

export interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: ReactNode
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  icon?: string
  isLoading?: boolean
  size?: ModalSize
}

const variantStyles: Record<
  ConfirmVariant,
  {
    iconBg: string
    iconText: string
    buttonVariant: ButtonVariant
    buttonClass?: string
  }
> = {
  danger: {
    iconBg: 'bg-vpos-red-bg',
    iconText: 'text-vpos-red',
    buttonVariant: 'soft',
    buttonClass: 'bg-vpos-red text-white hover:bg-red-700',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    buttonVariant: 'primary',
    buttonClass: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  primary: {
    iconBg: 'bg-vpos-sand',
    iconText: 'text-vpos-primary',
    buttonVariant: 'primary',
  },
  success: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    buttonVariant: 'primary',
    buttonClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Are you sure you want to perform this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  icon = 'question-line',
  isLoading = false,
  size = 'sm',
}: ConfirmModalProps) {
  const style = variantStyles[variant] || variantStyles.primary

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Modal
      open={open}
      onClose={isLoading ? () => {} : onClose}
      size={size}
      hideClose={isLoading}
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={style.buttonVariant}
            className={style.buttonClass}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Please wait…' : confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4 py-1">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[22px]',
            style.iconBg,
            style.iconText,
          )}
        >
          <Icon name={icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[16px] font-bold text-vpos-text">{title}</h3>
          {typeof description === 'string' ? (
            <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-vpos-muted">
              {description}
            </p>
          ) : (
            <div className="mt-1.5 text-[13px] leading-relaxed text-vpos-muted">
              {description}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
