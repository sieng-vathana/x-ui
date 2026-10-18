import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { khmerTranslations } from './khmer'
import { khmerCoreTranslations } from './khmer-core'

export type PortalLanguage = 'en' | 'km'

type LocaleContextValue = {
  language: PortalLanguage
  setLanguage: (language: PortalLanguage) => void
}

const STORAGE_KEY = 'vpos.portal-language'
const translationCatalog = { ...khmerTranslations, ...khmerCoreTranslations }
const LocaleContext = createContext<LocaleContextValue | null>(null)
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
    const translation = translationCatalog[key]
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
    const translation = language === 'km' ? translationCatalog[source.trim()] : undefined
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
