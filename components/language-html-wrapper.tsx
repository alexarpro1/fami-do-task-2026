"use client"

import { useEffect } from "react"
import { useFamily } from "@/context/family-context"
import { LANGUAGE_OPTIONS, applyTranslations, normalizeStoredLanguage } from "@/lib/i18n"

/** Setzt document.lang/dir und aktualisiert alle [data-i18n] bei Sprachwechsel (ohne Reload). */
export function LanguageHtmlWrapper() {
  const { state } = useFamily()
  const currentLang = normalizeStoredLanguage(state.settings?.language)

  useEffect(() => {
    const langOption = LANGUAGE_OPTIONS.find((l) => l.code === currentLang)
    if (langOption) {
      document.documentElement.lang = langOption.code
      document.documentElement.dir = langOption.dir
      applyTranslations(currentLang)
    }
  }, [currentLang])

  return null
}
