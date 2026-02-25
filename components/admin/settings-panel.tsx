"use client"

import type React from "react"
import { useState } from "react"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { LanguageSelector } from "@/components/settings/language-selector"
import { SchoolTimeSettings } from "@/components/admin/school-time-settings"
import { TestDataLoader } from "@/components/settings/test-data-loader"
import { SettingsBackup } from "@/components/settings/settings-backup"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { TabOrderEditor } from "@/components/admin/tab-order-editor"
import { ChildOrderEditor } from "@/components/admin/child-order-editor"
import { useFeatureOrder } from "@/components/admin/feature-order-editor"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { VersionBadge } from "@/components/ui/version-badge"
import { ParentNotificationSettings } from "@/components/settings/parent-notification-settings"
import { CloudSyncPanel } from "@/components/CloudSyncPanel"
import Link from "next/link"
import {
  Volume2,
  VolumeX,
  Sparkles,
  Lock,
  Check,
  X,
  Globe,
  Palette,
  PawPrint,
  Sticker,
  Cloud,
  Smile,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Database,
  Shield,
  ShieldOff,
  LayoutGrid,
  BellRing,
  ShoppingBag,
  User,
  Sliders,
  Code,
  Users,
  UserCog,
  Gamepad2,
  GripVertical,
  RotateCcw,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

function CollapsibleSection({
  id,
  icon,
  title,
  expanded,
  onToggle,
  children,
}: {
  id: string
  icon: React.ReactNode
  title: string
  expanded: boolean
  onToggle: (id: string) => void
  children: React.ReactNode
}) {
  return (
    <section className="bg-card rounded-2xl neu-flat overflow-hidden">
      <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export function SettingsPanel() {
  const { state, dispatch } = useFamily()
  const [showPinChange, setShowPinChange] = useState(false)
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const handleQuickExport = () => {
    const now = new Date().toISOString()
    const backup = {
      type: "all",
      version: "1.0.0",
      exportedAt: now,
      state: state,
    }
    const filename = `famido-komplett-backup-${new Date().toLocaleDateString("de-DE").replace(/\./g, "-")}.json`

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const updateSetting = (key: string, value: boolean | string | number[]) => {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { [key]: value },
    })
  }

  const handlePinChange = () => {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError("PIN muss 4 Ziffern haben")
      return
    }
    if (newPin !== confirmPin) {
      setPinError("PINs stimmen nicht überein")
      return
    }
    updateSetting("adminPin", newPin)
    setShowPinChange(false)
    setNewPin("")
    setConfirmPin("")
    setPinError("")
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const { orderIds: featureOrderIds, moveFeature, resetFeatureOrder } = useFeatureOrder()
  const adminPinEnabled = state.settings?.adminPinEnabled ?? true

  return (
    <div className="space-y-3">
      {/* Cloud-Sync (PowerSync-Status) */}
      <CollapsibleSection
        id="cloudSync"
        icon={<Cloud className="w-5 h-5" />}
        title="Cloud-Sync"
        expanded={expandedSection === "cloudSync"}
        onToggle={toggleSection}
      >
        <CloudSyncPanel />
      </CollapsibleSection>

      <CollapsibleSection
        id="theme"
        icon={<Palette className="w-5 h-5" />}
        title="Theme"
        expanded={expandedSection === "theme"}
        onToggle={toggleSection}
      >
        <ThemeSelector />
      </CollapsibleSection>

      <CollapsibleSection
        id="language"
        icon={<Globe className="w-5 h-5" />}
        title="Sprache"
        expanded={expandedSection === "language"}
        onToggle={toggleSection}
      >
        <LanguageSelector />
      </CollapsibleSection>

      {/* Push Notifications */}
      <CollapsibleSection
        id="notifications"
        icon={<BellRing className="w-5 h-5" />}
        title="Push-Benachrichtigungen"
        expanded={expandedSection === "notifications"}
        onToggle={toggleSection}
      >
        <NotificationSettings />
      </CollapsibleSection>

      {/* Parent Notifications */}
      <CollapsibleSection
        id="parentNotifications"
        icon={<Users className="w-5 h-5" />}
        title="Eltern-Benachrichtigungen"
        expanded={expandedSection === "parentNotifications"}
        onToggle={toggleSection}
      >
        <ParentNotificationSettings />
      </CollapsibleSection>

      {/* Tab Order */}
      <CollapsibleSection
        id="tabOrder"
        icon={<LayoutGrid className="w-5 h-5" />}
        title="Admin-Menü Reihenfolge"
        expanded={expandedSection === "tabOrder"}
        onToggle={toggleSection}
      >
        <TabOrderEditor />
      </CollapsibleSection>

      {/* Child (Individuen) Order */}
      <CollapsibleSection
        id="childOrder"
        icon={<UserCog className="w-5 h-5" />}
        title="Reihenfolge der Individuen (Kinder)"
        expanded={expandedSection === "childOrder"}
        onToggle={toggleSection}
      >
        <ChildOrderEditor />
      </CollapsibleSection>

      <CollapsibleSection
        id="features"
        icon={<Sliders className="w-5 h-5" />}
        title="Funktionen"
        expanded={expandedSection === "features"}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={resetFeatureOrder} className="text-xs gap-1">
              <RotateCcw className="w-3 h-3" />
              Reihenfolge zurücksetzen
            </Button>
          </div>
          {(() => {
            const orderIds = featureOrderIds
            const configs: Array<{
              key: string
              label: string
              icon: React.ReactNode
              checked: boolean
            }> = [
              {
                key: "soundEnabled",
                label: "Sound-Effekte",
                icon: state.settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />,
                checked: state.settings.soundEnabled,
              },
              { key: "animationsEnabled", label: "Animationen", icon: <Sparkles className="w-5 h-5" />, checked: state.settings.animationsEnabled },
              { key: "showConfetti", label: "Konfetti-Effekte", icon: <Sparkles className="w-5 h-5" />, checked: state.settings.showConfetti },
              { key: "petSystemEnabled", label: "Haustier-System", icon: <PawPrint className="w-5 h-5" />, checked: state.settings.petSystemEnabled },
              { key: "stickerSystemEnabled", label: "Sticker-Album", icon: <Sticker className="w-5 h-5" />, checked: state.settings.stickerSystemEnabled },
              { key: "weatherEnabled", label: "Wetter-Widget", icon: <Cloud className="w-5 h-5" />, checked: state.settings.weatherEnabled },
              { key: "moodTrackingEnabled", label: "Stimmungs-Tracker", icon: <Smile className="w-5 h-5" />, checked: state.settings.moodTrackingEnabled },
              { key: "shopEnabled", label: "Shop / Belohnungen", icon: <ShoppingBag className="w-5 h-5" />, checked: state.settings.shopEnabled ?? true },
              { key: "profileEnabled", label: "Profil-Seite", icon: <User className="w-5 h-5" />, checked: state.settings.profileEnabled ?? true },
              { key: "gamesEnabled", label: "Spiele (Minigames)", icon: <Gamepad2 className="w-5 h-5" />, checked: state.settings.gamesEnabled !== false },
            ]
            const byKey = new Map(configs.map((c) => [c.key, c]))
            const ordered = orderIds.map((key) => byKey.get(key)).filter(Boolean) as typeof configs
            const rest = configs.filter((c) => !orderIds.includes(c.key))
            const toShow = [...ordered, ...rest]

            return (
              <>
                <div className="space-y-2">
                  {toShow.map((item, index) => {
                    const actualIndex = orderIds.indexOf(item.key)
                    if (actualIndex === -1) return null
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl border border-border"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground shrink-0">
                          {item.key === "soundEnabled" ? (state.settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />) : item.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground block truncate">{item.label}</span>
                          {item.key === "soundEnabled" && (
                            <span className="text-xs text-muted-foreground">Erfolgs-Sound beim Abschließen von Aufgaben (Fokus-Timer)</span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveFeature(actualIndex, "up")}
                            disabled={actualIndex === 0}
                            aria-label="Nach oben"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveFeature(actualIndex, "down")}
                            disabled={actualIndex === orderIds.length - 1}
                            aria-label="Nach unten"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        <button
                          onClick={() => updateSetting(item.key, !item.checked)}
                          className={`w-12 h-7 rounded-full transition-colors relative shrink-0
                            ${item.checked ? "bg-primary" : "bg-secondary"}`}
                        >
                          <div
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
                              ${item.checked ? "translate-x-6" : "translate-x-1"}`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="pt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  <Gamepad2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Spiele-Seite (Reaktionsspiel, Memory, Schach, …) ist über „Mehr“ → Spiele in der Navigation erreichbar.{" "}
                    <Link href="/spiele" className="text-primary underline">Jetzt öffnen</Link>
                  </span>
                </div>
              </>
            )
          })()}
        </div>
      </CollapsibleSection>

      {/* School Time */}
      <CollapsibleSection
        id="schoolTime"
        icon={<GraduationCap className="w-5 h-5" />}
        title="Schulzeit-Sperre"
        expanded={expandedSection === "schoolTime"}
        onToggle={toggleSection}
      >
        <SchoolTimeSettings />
      </CollapsibleSection>

      {/* Admin PIN */}
      <CollapsibleSection
        id="adminPin"
        icon={<Lock className="w-5 h-5" />}
        title="Admin-PIN"
        expanded={expandedSection === "adminPin"}
        onToggle={toggleSection}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-secondary/50">
            <ToggleRow
              icon={adminPinEnabled ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
              label="PIN-Schutz aktivieren"
              checked={adminPinEnabled}
              onChange={(v) => updateSetting("adminPinEnabled", v)}
            />
            <p className="text-xs text-muted-foreground mt-2 ml-8">
              {adminPinEnabled
                ? "Der Admin-Bereich ist durch einen PIN geschützt."
                : "Der Admin-Bereich ist ohne PIN zugänglich."}
            </p>
          </div>

          {adminPinEnabled && (
            <>
              {showPinChange ? (
                <div className="space-y-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Neue PIN (4 Ziffern)"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="PIN bestätigen"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                  {pinError && <p className="text-sm text-destructive">{pinError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={handlePinChange} className="flex-1 rounded-xl">
                      <Check className="w-4 h-4 mr-2" />
                      Speichern
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowPinChange(false)
                        setNewPin("")
                        setConfirmPin("")
                        setPinError("")
                      }}
                      className="rounded-xl"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowPinChange(true)}
                  variant="outline"
                  className="w-full rounded-xl bg-transparent"
                >
                  PIN ändern
                </Button>
              )}
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Backup */}
      <CollapsibleSection
        id="backup"
        icon={<Database className="w-5 h-5" />}
        title="Backup & Wiederherstellung"
        expanded={expandedSection === "backup"}
        onToggle={toggleSection}
      >
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border-2 border-primary/20 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Alle Daten herunterladen</h3>
              <p className="text-xs text-muted-foreground">
                Komplettes Backup aller Kinder, Aufgaben, Belohnungen & Einstellungen
              </p>
            </div>
          </div>
          <Button onClick={handleQuickExport} className="w-full rounded-xl gap-2">
            <Database className="w-4 h-4" />
            Jetzt herunterladen
          </Button>
        </section>
        <SettingsBackup />
      </CollapsibleSection>

      {/* Developer Options */}
      <CollapsibleSection
        id="developer"
        icon={<Code className="w-5 h-5" />}
        title="Entwickler-Optionen"
        expanded={expandedSection === "developer"}
        onToggle={toggleSection}
      >
        <TestDataLoader />
      </CollapsibleSection>

      {/* App Info */}
      <section className="text-center py-4">
        <VersionBadge />
        <p className="text-xs text-muted-foreground mt-1">Made with love for families</p>
      </section>
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-foreground">{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full transition-colors relative
          ${checked ? "bg-primary" : "bg-secondary"}`}
      >
        <div
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
            ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  )
}
