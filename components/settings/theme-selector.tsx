"use client"

import { useFamily } from "@/context/family-context"
import { THEMES } from "@/lib/constants"
import { Moon, Sun, Check } from "lucide-react"
import { useEffect } from "react"

export function ThemeSelector() {
  const { state, dispatch } = useFamily()
  const settings = state?.settings ?? { theme: "sunrise" }

  const lightThemes = THEMES.filter((t) => !t.isDark)
  const darkThemes = THEMES.filter((t) => t.isDark)

  useEffect(() => {
    const currentTheme = THEMES.find((t) => t.id === settings.theme)
    THEMES.forEach((t) => {
      document.documentElement.classList.remove(`theme-${t.id}`)
    })
    document.documentElement.classList.remove("dark")
    if (currentTheme) {
      document.documentElement.classList.add(`theme-${currentTheme.id}`)
      if (currentTheme.isDark) {
        document.documentElement.classList.add("dark")
      }
    }
  }, [settings.theme])

  const handleThemeChange = (themeId: string) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: { theme: themeId } })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Sun className="h-3 w-3 text-amber-500" />
          <h4 className="text-xs font-medium text-muted-foreground">Hell</h4>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {lightThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`
                relative p-2 rounded-lg border-2 transition-all duration-200
                hover:scale-[1.05] active:scale-[0.95]
                ${
                  settings.theme === theme.id
                    ? "border-primary ring-2 ring-primary/30 shadow-lg"
                    : "border-border/50 hover:border-primary/50"
                }
              `}
              style={{ 
                backgroundColor: theme.background,
                borderColor: settings.theme === theme.id ? theme.primary : undefined
              }}
            >
              {settings.theme === theme.id && (
                <div 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="flex justify-center gap-1 mb-1.5">
                <div
                  className="w-4 h-4 rounded-full border-2 shadow-sm"
                  style={{ 
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                    boxShadow: `0 0 0 1px ${theme.background}`
                  }}
                />
                <div
                  className="w-4 h-4 rounded-full border-2 shadow-sm"
                  style={{ 
                    backgroundColor: theme.secondary,
                    borderColor: theme.secondary,
                    boxShadow: `0 0 0 1px ${theme.background}`
                  }}
                />
                <div
                  className="w-4 h-4 rounded-full border-2 shadow-sm"
                  style={{ 
                    backgroundColor: theme.accent,
                    borderColor: theme.accent,
                    boxShadow: `0 0 0 1px ${theme.background}`
                  }}
                />
              </div>
              <div className="text-center">
                <span className="text-base block mb-0.5">{theme.emoji}</span>
                <p 
                  className="text-[10px] font-semibold truncate" 
                  style={{ 
                    color: theme.primary,
                    textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                  }}
                >
                  {theme.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Moon className="h-3 w-3 text-indigo-400" />
          <h4 className="text-xs font-medium text-muted-foreground">Dunkel</h4>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {darkThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`
                relative p-2 rounded-lg border-2 transition-all duration-200
                hover:scale-[1.05] active:scale-[0.95]
                ${
                  settings.theme === theme.id
                    ? "ring-2 ring-primary/50 shadow-lg"
                    : "border-gray-700/50 hover:border-primary/50"
                }
              `}
              style={{ 
                backgroundColor: theme.background,
                borderColor: settings.theme === theme.id ? theme.primary : undefined
              }}
            >
              {settings.theme === theme.id && (
                <div 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="flex justify-center gap-1 mb-1.5">
                <div
                  className="w-4 h-4 rounded-full border-2 shadow-sm"
                  style={{ 
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                    boxShadow: `0 0 0 1px ${theme.background}, 0 2px 4px rgba(0,0,0,0.3)`
                  }}
                />
                <div
                  className="w-4 h-4 rounded-full border-2 shadow-sm"
                  style={{ 
                    backgroundColor: theme.secondary,
                    borderColor: theme.secondary,
                    boxShadow: `0 0 0 1px ${theme.background}, 0 2px 4px rgba(0,0,0,0.3)`
                  }}
                />
                <div
                  className="w-4 h-4 rounded-full border-2 shadow-sm"
                  style={{ 
                    backgroundColor: theme.accent,
                    borderColor: theme.accent,
                    boxShadow: `0 0 0 1px ${theme.background}, 0 2px 4px rgba(0,0,0,0.3)`
                  }}
                />
              </div>
              <div className="text-center">
                <span className="text-base block mb-0.5">{theme.emoji}</span>
                <p 
                  className="text-[10px] font-semibold truncate" 
                  style={{ 
                    color: theme.primary,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)'
                  }}
                >
                  {theme.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
