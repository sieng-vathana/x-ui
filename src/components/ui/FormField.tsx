import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  requiredMark?: boolean
}

const labelClass =
  'mb-2 block text-[12px] font-semibold tracking-[0.02em] text-vpos-dark'
const inputClass =
  'h-[39px] w-full rounded-[4px] border border-vpos-line bg-white px-3.5 text-[14px] text-vpos-text outline-none placeholder:text-vpos-muted transition-colors focus:border-vpos-primary focus:shadow-[0_0_0_2px_rgb(104_124_254_/_0.12)] disabled:cursor-not-allowed disabled:bg-vpos-subtle'

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
        <div className="rounded-t-[4px] border border-b-0 border-vpos-line bg-vpos-subtle px-3 py-2.5 text-[12px] font-semibold text-vpos-muted">
          B　I　U　　• List　　1. List　　Link
        </div>
      ) : null}
      <textarea
        id={fieldId}
        className={cn(
          'min-h-[105px] w-full resize-y border border-vpos-line bg-white p-3.5 text-[14px] text-vpos-text outline-none transition-colors focus:border-vpos-primary focus:shadow-[0_0_0_2px_rgb(104_124_254_/_0.12)]',
          showToolbar ? 'rounded-b-[4px] rounded-t-none' : 'rounded-[4px]',
        )}
        {...rest}
      />
    </label>
  )
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  requiredMark?: boolean
  placeholder?: string
  options: { value: string; label: string }[]
}

const selectClass =
  'h-[39px] w-full appearance-none rounded-[4px] border border-vpos-line bg-white px-3.5 pr-10 text-[14px] text-vpos-text outline-none transition-colors focus:border-vpos-primary focus:shadow-[0_0_0_2px_rgb(104_124_254_/_0.12)] disabled:cursor-not-allowed disabled:bg-vpos-subtle disabled:text-vpos-muted'

export function SelectField({
  label,
  requiredMark,
  placeholder,
  options,
  className,
  id,
  ...rest
}: SelectFieldProps) {
  const fieldId = id ?? rest.name
  return (
    <label className={cn('block w-full', className)} htmlFor={fieldId}>
      <span className={labelClass}>
        {label}
        {requiredMark || rest.required ? (
          <b className="text-vpos-red"> *</b>
        ) : null}
      </span>
      <div className="relative">
        <select id={fieldId} className={selectClass} {...rest}>
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-vpos-muted"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </label>
  )
}
