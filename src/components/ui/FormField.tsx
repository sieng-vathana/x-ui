import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  requiredMark?: boolean
}

const labelClass =
  'mb-2 block text-[11px] font-[750] text-vpos-primary'
const inputClass =
  'h-[42px] w-full rounded-[9px] border border-vpos-line bg-white px-3 text-[12px] text-vpos-text outline-none placeholder:text-vpos-muted focus:border-vpos-primary focus:shadow-[0_0_0_3px_#1d546c24] disabled:cursor-not-allowed disabled:bg-vpos-subtle'

export function FormField({
  label,
  requiredMark,
  className,
  id,
  ...rest
}: FormFieldProps) {
  const fieldId = id ?? rest.name
  return (
    <label className={cn('block w-full', className)} htmlFor={fieldId}>
      <span className={labelClass}>
        {label}
        {requiredMark || rest.required ? (
          <b className="text-vpos-red"> *</b>
        ) : null}
      </span>
      <input id={fieldId} className={inputClass} {...rest} />
    </label>
  )
}

export interface TextAreaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  requiredMark?: boolean
  showToolbar?: boolean
}

export function TextAreaField({
  label,
  requiredMark,
  showToolbar = true,
  className,
  id,
  ...rest
}: TextAreaFieldProps) {
  const fieldId = id ?? rest.name
  return (
    <label className={cn('block w-full', className)} htmlFor={fieldId}>
      <span className={labelClass}>
        {label}
        {requiredMark || rest.required ? (
          <b className="text-vpos-red"> *</b>
        ) : null}
      </span>
      {showToolbar ? (
        <div className="rounded-t-lg bg-vpos-subtle px-3 py-2.5 text-[11px] font-bold text-vpos-muted">
          B　I　U　　• List　　1. List　　Link
        </div>
      ) : null}
      <textarea
        id={fieldId}
        className={cn(
          'min-h-[105px] w-full resize-y border border-vpos-line bg-white p-3 text-[12px] text-vpos-text outline-none focus:border-vpos-primary focus:shadow-[0_0_0_3px_#1d546c24]',
          showToolbar ? 'rounded-b-lg rounded-t-none' : 'rounded-lg',
        )}
        {...rest}
      />
    </label>
  )
}
