"use client"

import { useFamily } from "@/context/family-context"
import { translations, t as tGlobal, normalizeStoredLanguage, type Language, type Translations } from "@/lib/i18n"

/** Aktuelle Sprache aus dem Context (Live-Update ohne Reload). */
export function useTranslation() {
  const { state } = useFamily()
  const lang = normalizeStoredLanguage(state.settings.language) as Language
  const dict = (translations[lang] ?? translations.de) as Translations

  /** Objekt für t.nav.home, t.common.points usw. (bestehende Komponenten). */
  const t = dict

  /** Übersetzung per Pfad + Platzhalter: translate("nav.home"), translate("tasks.capture", { count: 3 }) */
  const translate = (path: string, params?: Record<string, string | number>) => tGlobal(path, lang, params)

  return { t, translate, lang }
}

/** Nested-Objekt für Komponenten, die t.nav.home nutzen. */
export function getTranslation<T extends keyof Translations>(t: Translations, section: T): Translations[T] {
  return t[section]
}
