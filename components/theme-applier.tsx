"use client"

import { useEffect } from "react"
import { useFamily } from "@/context/family-context"
import { THEMES } from "@/lib/constants"

export function ThemeApplier() {
  const { state, isLoaded } = useFamily()
  const settings = state?.settings ?? { theme: "sunrise" }

  useEffect(() => {
    if (!isLoaded) return

    const currentTheme = THEMES.find((t) => t.id === settings.theme) ?? THEMES[0]

    // Remove all theme classes
    THEMES.forEach((t) => {
      document.documentElement.classList.remove(`theme-${t.id}`)
    })
    document.documentElement.classList.remove("dark")

    // Add current theme class
    document.documentElement.classList.add(`theme-${currentTheme.id}`)
    if (currentTheme.isDark) {
      document.documentElement.classList.add("dark")
    }

    // Update CSS variables dynamically based on theme
    const root = document.documentElement
    root.style.setProperty("--primary", currentTheme.primary)
    root.style.setProperty("--secondary", currentTheme.secondary)
    root.style.setProperty("--accent", currentTheme.accent)
    root.style.setProperty("--background", currentTheme.background)
    
    // Set colors based on theme type (light/dark)
    if (currentTheme.isDark) {
      // Dark themes: light text on dark background
      root.style.setProperty("--foreground", "#e2e8f0")
      root.style.setProperty("--sidebar-foreground", "#e2e8f0")
      root.style.setProperty("--card", currentTheme.secondary || "#1e293b")
      root.style.setProperty("--card-foreground", "#e2e8f0")
      root.style.setProperty("--popover", currentTheme.secondary || "#1e293b")
      root.style.setProperty("--popover-foreground", "#e2e8f0")
      root.style.setProperty("--muted", currentTheme.secondary || "#1e293b")
      root.style.setProperty("--muted-foreground", "#94a3b8")
      root.style.setProperty("--border", currentTheme.secondary || "#334155")
      root.style.setProperty("--input", currentTheme.secondary || "#1e293b")
      root.style.setProperty("--ring", currentTheme.primary)
      root.style.setProperty("--primary-foreground", currentTheme.background)
      root.style.setProperty("--secondary-foreground", "#e2e8f0")
      root.style.setProperty("--accent-foreground", currentTheme.background)
    } else {
      // Light themes: dark text on light background
      root.style.setProperty("--foreground", "#2b2d42")
      root.style.setProperty("--sidebar-foreground", "#2b2d42")
      root.style.setProperty("--card", "#ffffff")
      root.style.setProperty("--card-foreground", "#2b2d42")
      root.style.setProperty("--popover", "#ffffff")
      root.style.setProperty("--popover-foreground", "#2b2d42")
      root.style.setProperty("--muted", currentTheme.secondary || "#fff8f0")
      root.style.setProperty("--muted-foreground", "#6b7280")
      root.style.setProperty("--border", currentTheme.secondary || "#ffe5c4")
      root.style.setProperty("--input", currentTheme.secondary || "#fff3e0")
      root.style.setProperty("--ring", currentTheme.primary)
      root.style.setProperty("--primary-foreground", "#ffffff")
      root.style.setProperty("--secondary-foreground", "#2b2d42")
      root.style.setProperty("--accent-foreground", "#2b2d42")
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", currentTheme.primary)
    }
  }, [settings.theme, isLoaded])

  return null
}
