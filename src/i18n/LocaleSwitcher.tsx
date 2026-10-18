import { useLocale } from './LocaleContext'
import { Icon } from '../components/ui/Icon'

/** Compact language control for the merchant portal. */
export function LocaleSwitcher() {
  const { language, setLanguage } = useLocale()
  const nextLanguage = language === 'en' ? 'km' : 'en'
  return (
    <button
      type="button"
      data-locale-ignore
      onClick={() => setLanguage(nextLanguage)}
      aria-label={language === 'en' ? 'ប្តូរទៅភាសាខ្មែរ' : 'Switch to English'}
      title={language === 'en' ? 'ប្តូរទៅភាសាខ្មែរ' : 'Switch to English'}
      className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-[4px] border border-vpos-line bg-vpos-surface px-2.5 text-[12px] font-bold text-vpos-text hover:bg-vpos-subtle sm:px-3"
    >
      <Icon name="global-line" className="text-[16px]" />
      <span>{language === 'en' ? 'ខ្មែរ' : 'EN'}</span>
    </button>
  )
}
