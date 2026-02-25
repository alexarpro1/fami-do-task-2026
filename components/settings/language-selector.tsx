"use client"

import { useFamily } from "@/context/family-context"
import { LANGUAGE_OPTIONS, LANG_STORAGE_KEY, applyTranslations, normalizeStoredLanguage, type Language } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function LanguageSelector() {
  const { state, dispatch } = useFamily()

  const handleLanguageChange = (lang: Language) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: { language: lang } })
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
      applyTranslations(lang)
    }
  }

  const lang = normalizeStoredLanguage(state.settings.language)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {LANGUAGE_OPTIONS.map((option) => {
        const isSelected = lang === option.code

        return (
          <button
            key={option.code}
            onClick={() => handleLanguageChange(option.code)}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-lg transition-all",
              isSelected ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary/50 hover:bg-secondary",
            )}
          >
            <span className="text-2xl">{option.flag}</span>
            <div className="text-xs font-medium text-center">{option.name}</div>
            {isSelected && <Check className="w-4 h-4 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}
