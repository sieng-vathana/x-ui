import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { khmerTranslations } from './khmer'
import { khmerTemplates } from './khmer-templates'

export type PortalLanguage = 'en' | 'km'

type LocaleContextValue = {
  language: PortalLanguage
  setLanguage: (language: PortalLanguage) => void
  t: (text: string) => string
}

const STORAGE_KEY = 'vpos.portal-language'
const translationCatalog: Record<string, string> = khmerTranslations
const lowerCatalog = new Map<string, string>()
for (const [key, val] of Object.entries(translationCatalog)) {
  const lk = key.toLowerCase()
  if (!lowerCatalog.has(lk)) lowerCatalog.set(lk, val)
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

type TemplatePattern = { anchor: string; pattern: RegExp; slots: number[]; translation: string; numericOnly: boolean }

/** "{0} is fully received. {1} unit{2} added to stock." becomes a pattern that captures the values. */
const templatePatterns: TemplatePattern[] = Object.entries(khmerTemplates).map(([english, translation]) => {
  const parts = english.split(/\{(\d+)\}/)
  const slots: number[] = []
  let source = '^'
  parts.forEach((part, index) => {
    if (index % 2 === 0) source += part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    else {
      slots.push(Number(part))
      source += '([\\s\\S]*?)'
    }
  })
  const literals = parts.filter((_, index) => index % 2 === 0)
  const anchor = [...literals].sort((a, b) => b.length - a.length)[0] ?? ''
  // With little fixed text, like "Edit {0}", require slot values to either contain digits or be known catalog terms.
  const numericOnly = literals.join('').trim().length < 10
  return { anchor, pattern: new RegExp(`${source}$`), slots, translation, numericOnly }
})

/** Khmer for a whole text: exact match, punctuation handling, case-insensitive fallback, or template. */
export function lookup(text: string): string | undefined {
  if (!text) return undefined

  // 1. Exact catalog match
  const exact = translationCatalog[text]
  if (exact !== undefined) return exact

  // 2. Trailing colon: "Store:" -> lookup("Store") + "៖"
  if (text.endsWith(':') || text.endsWith('：')) {
    const base = text.slice(0, -1).trim()
    const baseTrans = lookup(base)
    if (baseTrans) return `${baseTrans}៖`
  }

  // 3. Trailing ellipsis: "Loading…" / "Loading..." -> lookup("Loading") + "…"
  if (text.endsWith('…')) {
    const base = text.slice(0, -1).trim()
    const baseTrans = lookup(base)
    if (baseTrans) return `${baseTrans}…`
  } else if (text.endsWith('...')) {
    const base = text.slice(0, -3).trim()
    const baseTrans = lookup(base)
    if (baseTrans) return `${baseTrans}…`
  }

  // 4. Case-insensitive fallback
  const lower = lowerCatalog.get(text.toLowerCase())
  if (lower !== undefined) return lower

  // 5. Template patterns
  for (const template of templatePatterns) {
    if (template.anchor && !text.includes(template.anchor)) continue
    const match = template.pattern.exec(text)
    if (!match) continue

    // For short templates, check that captured slots either contain numbers OR are known words
    if (template.numericOnly) {
      const captured = match.slice(1)
      const valid = captured.some((val) => {
        const trimmed = val.trim()
        return /\d/.test(trimmed) || translationCatalog[trimmed] !== undefined || lowerCatalog.has(trimmed.toLowerCase())
      })
      if (!valid) continue
    }

    const values = new Map(template.slots.map((slot, index) => [slot, match[index + 1]]))
    return template.translation.replace(/\{(\d+)\}/g, (_, slot: string) => {
      const value = values.get(Number(slot)) ?? ''
      const trimmed = value.trim()
      return lookup(trimmed) ?? value
    })
  }

  return undefined
}

export function t(text: string, language: PortalLanguage = 'km'): string {
  if (language !== 'km') return text
  return lookup(text) ?? text
}

const textState = new WeakMap<Text, { original: string; translated: string }>()
const attributeState = new WeakMap<Element, Map<string, { original: string; translated: string }>>()

function storedLanguage(): PortalLanguage {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'km' ? 'km' : 'en'
  } catch {
    return 'en'
  }
}

function preserveWhitespace(value: string, translated: string) {
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/)
  return `${match?.[1] ?? ''}${translated}${match?.[3] ?? ''}`
}

function shouldSkipText(node: Text) {
  let element = node.parentElement
  while (element) {
    if (element.hasAttribute('data-locale-ignore') || ['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(element.tagName)) return true
    element = element.parentElement
  }
  return false
}

function translateText(node: Text, language: PortalLanguage) {
  if (shouldSkipText(node)) return
  const current = node.nodeValue ?? ''
  const known = textState.get(node)
  const source = known && current === known.translated ? known.original : current
  const key = source.trim()
  if (!key) return

  if (language === 'km') {
    const translation = lookup(key)
    if (!translation) return
    const next = preserveWhitespace(source, translation)
    if (next !== current) {
      textState.set(node, { original: source, translated: next })
      node.nodeValue = next
    }
  } else if (known && current === known.translated) {
    node.nodeValue = known.original
    textState.delete(node)
  }
}

const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt']

function translateAttributes(element: Element, language: PortalLanguage) {
  if (element.hasAttribute('data-locale-ignore')) return
  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute)
    if (!current) continue
    let states = attributeState.get(element)
    const known = states?.get(attribute)
    const source = known && current === known.translated ? known.original : current
    const translation = language === 'km' ? lookup(source.trim()) : undefined
    if (translation) {
      if (translation !== current) {
        states ??= new Map()
        states.set(attribute, { original: source, translated: translation })
        attributeState.set(element, states)
        element.setAttribute(attribute, translation)
      }
    } else if (language === 'en' && known && current === known.translated) {
      element.setAttribute(attribute, known.original)
      states?.delete(attribute)
    }
  }
}

function localizeTree(root: Node, language: PortalLanguage) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateText(root as Text, language)
    return
  }
  if (root instanceof Element) translateAttributes(root, language)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) translateText(node as Text, language)
  if (root instanceof Element) root.querySelectorAll('*').forEach((element) => translateAttributes(element, language))
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<PortalLanguage>(storedLanguage)
  const setLanguage = useCallback((next: PortalLanguage) => {
    setLanguageState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The language still applies for this session when storage is unavailable.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dataset.portalLanguage = language
    localizeTree(document.body, language)

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') localizeTree(record.target, language)
        else if (record.type === 'attributes') localizeTree(record.target, language)
        else record.addedNodes.forEach((node) => localizeTree(node, language))
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    })
    return () => observer.disconnect()
  }, [language])

  const translate = useCallback((text: string) => (language === 'km' ? (lookup(text) ?? text) : text), [language])
  const value = useMemo(() => ({ language, setLanguage, t: translate }), [language, setLanguage, translate])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}
