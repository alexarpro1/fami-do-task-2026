import type React from "react"
import type { Metadata, Viewport } from "next"
import { Nunito, Fredoka } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { FamilyProvider } from "@/context/family-context"
import { ThemeApplier } from "@/components/theme-applier"
import { ErrorBoundary } from "@/components/error-boundary"
import { LanguageHtmlWrapper } from "@/components/language-html-wrapper"
import { UpdateAvailableBanner } from "@/components/ui/update-available-banner"
import { PowerSyncProvider } from "@/context/PowerSyncProvider"
import "./globals.css"

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
})

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
})

export const metadata: Metadata = {
  title: "FamiDo Task - Familien Routine & Belohnungen",
  description: "Spielerische Aufgaben-Verwaltung für Kinder mit Punktesystem, Belohnungen und virtuellem Haustier",
  generator: "FdT",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FamiDo Task",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('family-routine-app-v2');
    if (stored) {
      var data = JSON.parse(stored);
      var theme = data?.settings?.theme || 'midnight';
      var darkThemes = ['midnight', 'volcanic', 'forest', 'cosmic'];
      document.documentElement.className = 'theme-' + theme;
      if (darkThemes.includes(theme)) {
        document.documentElement.classList.add('dark');
      }
    }
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="de"
      className="theme-midnight dark"
      suppressHydrationWarning
      style={{ backgroundColor: "#0f172a", colorScheme: "dark" }}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${nunito.variable} ${fredoka.variable} font-sans antialiased`}
        style={{ backgroundColor: "#0f172a", color: "#f8fafc" }}
      >
        <ErrorBoundary>
          <FamilyProvider>
            <PowerSyncProvider>
              <ThemeApplier />
              <LanguageHtmlWrapper />
              <UpdateAvailableBanner />
              {children}
            </PowerSyncProvider>
          </FamilyProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
