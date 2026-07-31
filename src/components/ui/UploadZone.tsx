import { useRef, type ChangeEvent } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export interface UploadZoneProps {
  title?: string
  description?: string
  tip?: string
  accept?: string
  multiple?: boolean
  onFiles?: (files: FileList | null) => void
  className?: string
}

export function UploadZone({
  title = 'Click to upload or drag and drop',
  description = 'PNG, JPG or WEBP • Max 5 MB',
  tip = 'Add up to 6 images. First image is the cover.',
  accept = 'image/*',
  multiple = true,
  onFiles,
  className,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles?.(e.target.files)
  }

  return (
    <div
      className={cn(
        'flex min-h-[184px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-vpos-primary-2 bg-[#f7f9fb] px-4',
        'hover:border-vpos-primary hover:bg-vpos-sand/30',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vpos-primary',
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-vpos-sand text-[21px] text-vpos-primary">
        <Icon name="upload-cloud-2-line" />
      </span>
      <strong className="text-[13px] text-vpos-text">{title}</strong>
      <small className="text-[11px] text-vpos-muted">{description}</small>
      {tip ? <small className="text-[11px] text-vpos-muted">{tip}</small> : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={onChange}
      />
    </div>
  )
}
