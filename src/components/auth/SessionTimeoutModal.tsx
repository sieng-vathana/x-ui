import { Button, Icon } from '..'

export interface SessionTimeoutModalProps {
  open: boolean
  secondsRemaining: number
  onContinue: () => void
  onSignOut: () => void
}

export function SessionTimeoutModal({
  open,
  secondsRemaining,
  onContinue,
  onSignOut,
}: SessionTimeoutModalProps) {
  if (!open) return null

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-[8px] border border-vpos-line bg-white shadow-2xl animate-in fade-in zoom-in-95">
        <div className="border-b border-vpos-line bg-vpos-sand/40 px-6 py-4">
          <div className="flex items-center gap-3 text-vpos-primary">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-vpos-sand text-[20px]">
              <Icon name="time-line" />
            </span>
            <div>
              <h3 className="m-0 text-[16px] font-bold text-vpos-text">
                Session Timing Out
              </h3>
              <p className="m-0 text-[12px] font-medium text-vpos-muted">
                30-Minute Inactivity Policy
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 text-center">
          <p className="m-0 text-[14px] leading-relaxed text-vpos-text">
            You have been inactive for nearly 30 minutes. To protect your store data, you will be automatically signed out in:
          </p>

          <div className="my-4 inline-flex items-center justify-center rounded-[6px] bg-vpos-subtle px-5 py-2.5 font-mono text-[28px] font-black tracking-wider text-vpos-primary border border-vpos-line">
            {formattedTime}
          </div>

          <p className="m-0 text-[12px] text-vpos-muted">
            Move your mouse or click anywhere to keep your session active.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-vpos-line bg-vpos-surface px-6 py-3.5">
          <Button variant="secondary" onClick={onSignOut}>
            Sign out now
          </Button>
          <Button onClick={onContinue}>
            <Icon name="check-line" /> Keep me signed in
          </Button>
        </div>
      </div>
    </div>
  )
}
