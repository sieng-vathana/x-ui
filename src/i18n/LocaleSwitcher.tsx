import { useLocale } from './LocaleContext'

function CambodiaFlag() {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 18" className="h-3.5 w-[23px] overflow-hidden rounded-[2px] shadow-sm">
      <rect width="30" height="18" fill="#032EA1" />
      <rect y="4" width="30" height="10" fill="#E00025" />
      <path
        fill="#fff"
        d="M5 13.5h20v-1h-1.4V9.1h-1.8v1.1h-1V7.7l-2.2 1.4V6.4L15 3.5l-2.6 2.9v2.7l-2.2-1.4v2.8h-1V9.1H7.4v3.4H5v1Zm2.7-1.8h14.6v.8H7.7v-.8Zm2.6-2.3 1.5.9V9.1l2.2 1.4V8.8L15 6.9l1 1.9v1.7l2.2-1.4v1.2l1.5-.9v2.3h-9.4V9.4Z"
      />
      <path d="M8 15h14M10 16h10" stroke="#fff" strokeWidth=".7" />
    </svg>
  )
}

function UnitedKingdomFlag() {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 18" className="h-3.5 w-[23px] overflow-hidden rounded-[2px] shadow-sm">
      <rect width="30" height="18" fill="#012169" />
      <path d="m0 0 30 18M30 0 0 18" stroke="#fff" strokeWidth="4" />
      <path d="m0 0 30 18M30 0 0 18" stroke="#C8102E" strokeWidth="1.5" />
      <path d="M15 0v18M0 9h30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0v18M0 9h30" stroke="#C8102E" strokeWidth="3" />
    </svg>
  )
}

/** Compact language control for the merchant portal. */
export function LocaleSwitcher() {
  const { language, setLanguage } = useLocale()
  const optionClassName = 'inline-flex h-[30px] shrink-0 items-center justify-center gap-1.5 rounded-[3px] px-2 text-[11px] font-bold transition-colors'

  return (
    <div
      role="group"
      aria-label="Select language"
      data-locale-ignore
      className="inline-flex h-[38px] shrink-0 items-center gap-0.5 rounded-[4px] border border-vpos-line bg-vpos-surface p-[3px]"
    >
      <button
        type="button"
        onClick={() => setLanguage('km')}
        aria-label="ខ្មែរ"
        aria-pressed={language === 'km'}
        title="ខ្មែរ"
        className={`${optionClassName} ${language === 'km' ? 'bg-vpos-primary text-white shadow-sm' : 'text-vpos-text hover:bg-vpos-subtle'}`}
      >
        <CambodiaFlag />
        <span>ខ្មែរ</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-label="English"
        aria-pressed={language === 'en'}
        title="English"
        className={`${optionClassName} ${language === 'en' ? 'bg-vpos-primary text-white shadow-sm' : 'text-vpos-text hover:bg-vpos-subtle'}`}
      >
        <UnitedKingdomFlag />
        <span>EN</span>
      </button>
    </div>
  )
}
