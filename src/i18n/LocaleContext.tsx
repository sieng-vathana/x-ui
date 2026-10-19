import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { khmerTranslations } from './khmer'
import { khmerTemplates } from './khmer-templates'

export type PortalLanguage = 'en' | 'km'

type LocaleContextValue = {
  language: PortalLanguage
  setLanguage: (language: PortalLanguage) => void
}

const STORAGE_KEY = 'vpos.portal-language'
const translationCatalog: Record<string, string> = khmerTranslations
const LocaleContext = createContext<LocaleContextValue | null>(null)

type TemplatePattern = { anchor: string; pattern: RegExp; slots: number[]; translation: string; numericOnly: boolean }

/** "{0} is fully received. {1} unit{2} added to stock." becomes a pattern that captures the three values. */
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
  // With little fixed text, like "Edit {0}", only numbers and codes count as values, so a product named
  // "Edit Mode Coffee" is not half translated.
  const numericOnly = literals.join('').trim().length < 10
  return { anchor, pattern: new RegExp(`${source}$`), slots, translation, numericOnly }
})

/** Khmer for a whole text: an exact catalog entry first, then a template with its values put back in. */
function lookup(text: string): string | undefined {
  const exact = translationCatalog[text]
  if (exact !== undefined) return exact
  for (const template of templatePatterns) {
    if (template.anchor && !text.includes(template.anchor)) continue
    const match = template.pattern.exec(text)
    if (!match) continue
    if (template.numericOnly && !match.slice(1).some((value) => /\d/.test(value))) continue
    const values = new Map(template.slots.map((slot, index) => [slot, match[index + 1]]))
    // A value that is itself known text, like a status, is translated too.
    return template.translation.replace(/\{(\d+)\}/g, (_, slot: string) => {
      const value = values.get(Number(slot)) ?? ''
      return translationCatalog[value.trim()] ?? value
    })
  }
  return undefined
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

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}
