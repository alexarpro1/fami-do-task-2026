"use client"

import type React from "react"
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import type { AppSettings } from "@/types"
import { useFamily } from "@/context/family-context"
import { Button } from "@/components/ui/button"
import { LanguageSelector } from "@/components/settings/language-selector"
import { SchoolTimeSettings } from "@/components/admin/school-time-settings"
import { TestDataLoader } from "@/components/settings/test-data-loader"
import { SettingsBackup } from "@/components/settings/settings-backup"
import { CloudSyncPanel } from "@/components/cloud-sync/CloudSyncPanel"
import { LocalNetworkSyncPanel } from "@/components/local-sync/LocalNetworkSyncPanel"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { TabOrderEditor } from "@/components/admin/tab-order-editor"
import { ChildOrderEditor } from "@/components/admin/child-order-editor"
import { useFeatureOrder } from "@/components/admin/feature-order-editor"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { VersionBadge, CapacitorInfoBlock } from "@/components/ui/version-badge"
import { useTranslation } from "@/hooks/use-translation"
import { ParentNotificationSettings } from "@/components/settings/parent-notification-settings"
import { APP_VERSION } from "@/lib/version"
import { exportBlobAsFile, isExportLocationChoiceSupported, isSaveFilePickerSupported } from "@/lib/export-file"
import { getDailyBackupEnabled, setDailyBackupEnabled, getBackupStorageInfo, BACKUP_FOLDER_DISPLAY_PATH } from "@/lib/daily-backup"
import { EMERGENCY_BACKUP_LS_KEY } from "@/lib/emergency-backup"
import { isNativeApp, isCapacitorNativeShell, getPlatform } from "@/lib/device"
import {
  openHomeSettings,
  getBackButtonBlockEnabled,
  setBackButtonBlockEnabled,
  openAndroidApplicationDetailsSettings,
} from "@/lib/kiosk"
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
  Crown,
  GripVertical,
  RotateCcw,
  DownloadCloud,
  FolderOpen,
  FolderSearch,
  Smartphone,
  Scale,
  LifeBuoy,
  Mic,
  Film,
  Camera,
  MapPin,
  Settings,
  Contact,
  Image,
  Bluetooth,
  Radio,
  Wifi,
} from "lucide-react"
import { useAppUpdate } from "@/hooks/useAppUpdate"
import { AnimatePresence, motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ChildLocationShareBlock } from "@/components/settings/child-location-share-block"
import { DeveloperLogPanel } from "@/components/settings/developer-log-panel"
import { ParentGpsOverviewDialogTrigger } from "@/components/admin/parent-gps-overview-dialog"
import { useDeviceRole } from "@/hooks/useDeviceRole"
import { captureChildLocation, applyChildLocationToState } from "@/lib/child-location-share"
import { computeParentLocationOverviewStats } from "@/lib/location/parent-overview-stats"
import { useToast } from "@/hooks/use-toast"
import {
  promptMicrophoneAccess,
  promptCameraAccess,
  promptPhotoLibraryAccess,
  promptContactsAccess,
  promptBackgroundLocationAccess,
  promptFullDeviceAccess,
  getNativePermissionStatus,
  promptFilesystemPermissionsIfNative,
} from "@/lib/device-access-prompts"

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
    <section id={`settings-section-${id}`} className="bg-card rounded-2xl neu-flat overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-colors",
          expanded ? "bg-secondary/60" : "hover:bg-secondary/40",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h3 className="font-semibold text-foreground text-sm sm:text-base">{title}</h3>
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
            className="overflow-hidden text-foreground"
          >
            <div className="px-4 pt-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

const FAMIAPP_EXPORT_LOC_PREF = "famiapp_export_choose_location"

function AppUpdateBlock() {
  const { translate } = useTranslation()
  const { updateAvailable, latestVersion, downloadUrl } = useAppUpdate()
  if (!updateAvailable) return null
  const displayVersion = latestVersion ? (latestVersion.startsWith("V") ? latestVersion : `V${latestVersion}`) : ""
  return (
    <div className="mb-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between gap-3">
      <div>
        <h4 className="font-bold text-blue-500 dark:text-blue-400">{translate("compSettingsPanel.updateAvailable")}</h4>
        <p className="text-sm text-muted-foreground">
          {displayVersion ? translate("compSettingsPanel.versionOnline", { version: displayVersion }) : translate("compSettingsPanel.versionAvailable")}
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 gap-2 bg-blue-600 hover:bg-blue-500 text-white"
        onClick={() => typeof window !== "undefined" && window.open(downloadUrl, "_blank")}
      >
        <DownloadCloud className="w-4 h-4" />
        {translate("compSettingsPanel.updateNow")}
      </Button>
    </div>
  )
}

export function SettingsPanel() {
  const MASTER_PIN_LOCK_UNTIL_KEY = "famiapp-master-pin-lock-until"
  const { state, dispatch } = useFamily()
  const { t, translate } = useTranslation()
  const { toast } = useToast()
  const [deviceRole, setDeviceRole, deviceRoleHydrated] = useDeviceRole()
  const showParentGpsOverview =
    deviceRoleHydrated && (deviceRole === "parent" || deviceRole === "master")
  const showDeveloperOptions =
    deviceRoleHydrated && (deviceRole === "parent" || deviceRole === "master")
  const locationOverview = useMemo(
    () => computeParentLocationOverviewStats(state.children),
    [state.children],
  )
  const [showPinChange, setShowPinChange] = useState(false)
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [dailyBackupEnabled, setDailyBackupEnabledState] = useState(false)
  const [exportChooseLocation, setExportChooseLocationState] = useState(false)

  const setExportChooseLocation = (checked: boolean) => {
    setExportChooseLocationState(checked)
    try {
      window.localStorage.setItem(FAMIAPP_EXPORT_LOC_PREF, checked ? "1" : "0")
    } catch {
      /* ignore */
    }
  }

  useLayoutEffect(() => {
    try {
      const v = window.localStorage.getItem(FAMIAPP_EXPORT_LOC_PREF)
      if (v === "1") {
        setExportChooseLocationState(true)
        return
      }
      if (v === "0") {
        setExportChooseLocationState(false)
        return
      }
    } catch {
      /* ignore */
    }
    setExportChooseLocationState(isExportLocationChoiceSupported())
  }, [])
  useEffect(() => {
    if (typeof window === "undefined") return
    const openLocationOverview = () => {
      setExpandedSection("locationOverview")
      window.setTimeout(() => {
        const target = document.getElementById("settings-section-locationOverview")
        target?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 80)
    }
    window.addEventListener("famiapp:open-location-overview", openLocationOverview as EventListener)
    return () => {
      window.removeEventListener("famiapp:open-location-overview", openLocationOverview as EventListener)
    }
  }, [])
  const [showStorageDialog, setShowStorageDialog] = useState(false)
  const [storageInfo, setStorageInfo] = useState<{ path: string; files: string[] } | null>(null)
  const [backButtonBlockEnabled, setBackButtonBlockEnabledState] = useState(false)
  const [showMasterPinInput, setShowMasterPinInput] = useState(false)
  const [masterPinInput, setMasterPinInput] = useState("")
  const [masterPinError, setMasterPinError] = useState("")
  const [masterPinAttempts, setMasterPinAttempts] = useState(0)
  const [masterPinLockUntil, setMasterPinLockUntil] = useState<number | null>(null)
  const [masterLockNow, setMasterLockNow] = useState<number>(Date.now())
  const [deviceAccessHint, setDeviceAccessHint] = useState("")
  /** Pro Aktion getrennt — andere Buttons bleiben nutzbar. Ref verhindert Doppelklick vor dem nächsten Render. */
  const deviceAccessBusyRef = useRef<Set<string>>(new Set())
  const [deviceAccessBusyByKey, setDeviceAccessBusyByKey] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getDailyBackupEnabled().then(setDailyBackupEnabledState)
  }, [])
  useEffect(() => {
    if (getPlatform().isNative && getPlatform().isAndroid) {
      getBackButtonBlockEnabled().then(setBackButtonBlockEnabledState)
    } else {
      setBackButtonBlockEnabledState(false)
    }
  }, [])
  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(MASTER_PIN_LOCK_UNTIL_KEY)
    if (!raw) return
    const lockUntil = Number.parseInt(raw, 10)
    if (!Number.isFinite(lockUntil)) {
      window.localStorage.removeItem(MASTER_PIN_LOCK_UNTIL_KEY)
      return
    }
    if (lockUntil > Date.now()) {
      setMasterPinLockUntil(lockUntil)
      setMasterLockNow(Date.now())
    } else {
      window.localStorage.removeItem(MASTER_PIN_LOCK_UNTIL_KEY)
    }
  }, [])
  useEffect(() => {
    if (typeof window === "undefined") return
    if (masterPinLockUntil && masterPinLockUntil > Date.now()) {
      window.localStorage.setItem(MASTER_PIN_LOCK_UNTIL_KEY, String(masterPinLockUntil))
    } else {
      window.localStorage.removeItem(MASTER_PIN_LOCK_UNTIL_KEY)
    }
  }, [masterPinLockUntil])
  useEffect(() => {
    if (!masterPinLockUntil) return
    const timer = window.setInterval(() => setMasterLockNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [masterPinLockUntil])

  const handleDailyBackupToggle = (enabled: boolean) => {
    setDailyBackupEnabled(enabled).then(() => setDailyBackupEnabledState(enabled))
  }

  const handleShowStorage = async () => {
    const key = "storage"
    if (deviceAccessBusyRef.current.has(key)) return
    deviceAccessBusyRef.current.add(key)
    setDeviceAccessBusyByKey((b) => ({ ...b, [key]: true }))
    try {
      await promptFilesystemPermissionsIfNative()
      setStorageInfo(null)
      setShowStorageDialog(true)
      const info = await getBackupStorageInfo()
      setStorageInfo(info)
    } finally {
      deviceAccessBusyRef.current.delete(key)
      setDeviceAccessBusyByKey((b) => {
        const { [key]: _, ...rest } = b
        return rest
      })
    }
  }

  const handleQuickExport = async () => {
    const now = new Date().toISOString()
    const backup = {
      type: "all",
      version: APP_VERSION.full,
      exportedAt: now,
      state: state,
    }
    const filename = `famido-komplett-backup-${new Date().toLocaleDateString("de-DE").replace(/\./g, "-")}.json`
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
    await exportBlobAsFile(blob, filename, { chooseLocation: exportChooseLocation })
  }

  const withDeviceAccessBusy = async (key: string, fn: () => Promise<void>) => {
    if (deviceAccessBusyRef.current.has(key)) return
    deviceAccessBusyRef.current.add(key)
    setDeviceAccessBusyByKey((b) => ({ ...b, [key]: true }))
    try {
      await fn()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler"
      setDeviceAccessHint(`Aktion fehlgeschlagen: ${message}`)
    } finally {
      deviceAccessBusyRef.current.delete(key)
      setDeviceAccessBusyByKey((b) => {
        const { [key]: _, ...rest } = b
        return rest
      })
    }
  }

  const requestMicrophoneAccess = () =>
    withDeviceAccessBusy("mic", async () => {
      setDeviceAccessHint("")
      await promptMicrophoneAccess()
      setDeviceAccessHint("Mikrofonzugriff ist aktiv.")
    })

  const requestCameraAccess = () =>
    withDeviceAccessBusy("camera", async () => {
      setDeviceAccessHint("")
      await promptCameraAccess()
      setDeviceAccessHint("Kamerazugriff ist aktiv.")
    })

  const requestGpsAccess = () =>
    withDeviceAccessBusy("gps", async () => {
      setDeviceAccessHint("")
      await promptBackgroundLocationAccess()
      await captureChildLocation()
      setDeviceAccessHint("GPS inkl. Hintergrund-Standort angefragt (System: „Immer erlauben“).")
    })

  const requestFullAccess = () =>
    withDeviceAccessBusy("full", async () => {
      setDeviceAccessHint("")
      const status = await promptFullDeviceAccess()
      if (status) {
        const line = (k: string, v: string) => `${k}: ${v}`
        setDeviceAccessHint(
          [
            "Vollzugriff angefragt (Play-Store / Kinderschutz):",
            line("Standort", status.location),
            line("Hintergrund-Standort", status.locationBackground),
            line("Mikrofon", status.microphone),
            line("Kamera", status.camera),
            line("Benachrichtigungen", status.notifications),
            line("Medien", status.media),
            line("Kontakte", status.contactsRead),
          ].join(" · "),
        )
      } else {
        setDeviceAccessHint("Browser: Einzelrechte bestmöglich angefragt. Voller Zugriff nur in der Android-APK.")
      }
      try {
        await getNativePermissionStatus()
      } catch {
        // ignore
      }
    })

  /**
   * System-„App-Info“ (Berechtigungen): Android über natives KioskPlugin, da @capacitor/app v6
   * kein openSettings auf Android hat. iOS: derzeit kein zuverlässiger WebView-Öffner ohne natives Plugin.
   */
  const openNativeAppSettingsIfPossible = async (): Promise<boolean> => {
    if (!isCapacitorNativeShell()) return false
    if (getPlatform().isAndroid) {
      try {
        await openAndroidApplicationDetailsSettings()
        return true
      } catch {
        return false
      }
    }
    return false
  }

  const openAppPermissionSettings = () =>
    withDeviceAccessBusy("settings", async () => {
      setDeviceAccessHint("")
      if (!isCapacitorNativeShell()) {
        setDeviceAccessHint(
          "Systemeinstellungen sind nur in der installierten App (Android/iOS) verfügbar – im Browser nicht.",
        )
        return
      }
      const ok = await openNativeAppSettingsIfPossible()
      setDeviceAccessHint(
        ok ? "Geräte-Einstellungen geöffnet." : "Geräte-Einstellungen konnten nicht geöffnet werden.",
      )
    })

  const requestPhotoAccess = () =>
    withDeviceAccessBusy("photo", async () => {
      setDeviceAccessHint("")
      await promptPhotoLibraryAccess()
      setDeviceAccessHint("Fotozugriff ist aktiv.")
    })

  const requestContactsAccess = () =>
    withDeviceAccessBusy("contacts", async () => {
      setDeviceAccessHint("")
      try {
        await promptContactsAccess()
        setDeviceAccessHint("Kontaktzugriff ist aktiv.")
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg === "CONTACTS_UNAVAILABLE") {
          setDeviceAccessHint(
            isCapacitorNativeShell()
              ? "Kontaktauswahl nicht verfügbar – bitte in den Geräte-Einstellungen READ_CONTACTS erlauben."
              : "Kontakte: In diesem Browser nicht verfügbar. In der installierten App unter Systemeinstellungen erlauben.",
          )
          if (isCapacitorNativeShell()) {
            await openNativeAppSettingsIfPossible()
          }
          return
        }
        throw e
      }
    })

  const updateSetting = (
    key: string,
    value: boolean | string | number | number[] | AppSettings["nearbyGamesAllowed"],
  ) => {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { [key]: value },
    })
  }

  const updateNearbyGameAllowed = (game: "chess" | "dame", allowed: boolean) => {
    const current = state.settings.nearbyGamesAllowed ?? { chess: true, dame: true }
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        nearbyGamesAllowed: { ...current, [game]: allowed },
      },
    })
  }

  const setLiveIntervalSeconds = (secondsRaw: number) => {
    const next = Math.max(5, Math.min(120, Math.round(secondsRaw)))
    updateSetting("childLocationLiveIntervalSeconds", next)
  }

  const triggerManualLiveLocationSend = async () => {
    if (typeof window === "undefined") return
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        childLocationLiveEnabled: true,
        childLocationLiveManualSendEnabled: true,
      },
    })

    // Kind-Gerät: AutoShare-Runner hört auf das Event
    if (deviceRole === "child") {
      window.dispatchEvent(new CustomEvent("famiapp:location-live-send-now"))
      toast({
        title: "Live-Standort",
        description: "Senden auf diesem Kind-Gerät gestartet.",
      })
      return
    }

    // Eltern/Master: Event würde nichts tun (Runner nur bei Rolle Kind) → hier lokal schreiben
    const children = state.children ?? []
    const childId =
      (state.selectedChildId && children.some((c) => c.id === state.selectedChildId)
        ? state.selectedChildId
        : null) ?? children[0]?.id
    if (!childId) {
      toast({
        title: "Kein Kind",
        description: "Bitte zuerst ein Kind anlegen, dann erneut senden.",
        variant: "destructive",
      })
      return
    }
    try {
      const loc = await captureChildLocation()
      applyChildLocationToState(dispatch, childId, loc, "manual")
      const name = children.find((c) => c.id === childId)?.name ?? "Kind"
      toast({
        title: "Test-Standort gesendet",
        description: `Position für ${name} gespeichert (APK/Browser). Sync übernimmt bei aktiver Cloud.`,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Standort nicht verfügbar"
      toast({
        title: "Standort fehlgeschlagen",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handlePinChange = () => {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError(translate("compSettingsPanel.pinMustBe4Digits"))
      return
    }
    if (newPin !== confirmPin) {
      setPinError(translate("compSettingsPanel.pinsDoNotMatch"))
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

  const { orderIds: featureOrderIds, moveFeature, resetOrder: resetFeatureOrder } = useFeatureOrder()
  const adminPinEnabled = state.settings?.adminPinEnabled ?? true
  const MASTER_ACTIVATION_PIN = "369"
  const masterPinLockRemainingSec =
    masterPinLockUntil == null ? 0 : Math.max(0, Math.ceil((masterPinLockUntil - masterLockNow) / 1000))
  const masterPinLocked = masterPinLockRemainingSec > 0
  const locationHealth = useMemo(() => {
    const warningActive = state.settings.childLocationGpsWarningActive ?? false
    const warningSticky = state.settings.childLocationGpsWarningSticky ?? false
    const pendingAckNow = locationOverview.pendingAckNow
    const failedFeedbacks = state.settings.childLocationGpsFailureCount ?? 0

    const pendingLevel: "green" | "yellow" | "red" =
      pendingAckNow === 0 ? "green" : pendingAckNow <= 2 ? "yellow" : "red"
    const warningLevel: "green" | "yellow" | "red" = warningSticky ? "red" : warningActive ? "yellow" : "green"
    const feedbackLevel: "green" | "yellow" | "red" =
      failedFeedbacks === 0 ? "green" : failedFeedbacks <= 2 ? "yellow" : "red"

    const levelClass = (level: "green" | "yellow" | "red") =>
      level === "green"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : level === "yellow"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"

    return {
      pendingLevel,
      warningLevel,
      feedbackLevel,
      pendingClass: levelClass(pendingLevel),
      warningClass: levelClass(warningLevel),
      feedbackClass: levelClass(feedbackLevel),
    }
  }, [
    locationOverview.pendingAckNow,
    state.settings.childLocationGpsFailureCount,
    state.settings.childLocationGpsWarningActive,
    state.settings.childLocationGpsWarningSticky,
  ])

  const handleActivateMaster = () => {
    if (masterPinLocked) {
      setMasterPinError(`Zu viele Fehlversuche. Bitte ${masterPinLockRemainingSec}s warten.`)
      return
    }
    if (masterPinInput.trim() !== MASTER_ACTIVATION_PIN) {
      const nextAttempts = masterPinAttempts + 1
      if (nextAttempts >= 3) {
        setMasterPinAttempts(0)
        setMasterPinLockUntil(Date.now() + 30_000)
        setMasterPinError("Zu viele Fehlversuche. Master-Aktivierung ist 30 Sekunden gesperrt.")
      } else {
        setMasterPinAttempts(nextAttempts)
        setMasterPinError(`Falsche Master-PIN. Versuch ${nextAttempts}/3.`)
      }
      return
    }
    setMasterPinAttempts(0)
    setMasterPinLockUntil(null)
    setMasterPinError("")
    setMasterPinInput("")
    setShowMasterPinInput(false)
    void setDeviceRole("master")
  }

  return (
    <div className="space-y-3">
      {showParentGpsOverview && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 space-y-2 neu-flat">
          <p className="text-xs font-semibold text-amber-950 dark:text-amber-100">
            {translate("parentGpsOverview.warningTitle")}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {translate("parentGpsOverview.subtitle")}
          </p>
          <ParentGpsOverviewDialogTrigger fullWidth className="rounded-xl border-amber-600/40 bg-background/80" />
        </section>
      )}

      <CollapsibleSection
        id="theme"
        icon={<Palette className="w-5 h-5" />}
        title={translate("settingsPanel.theme")}
        expanded={expandedSection === "theme"}
        onToggle={toggleSection}
      >
        <ThemeSelector />
      </CollapsibleSection>

      <CollapsibleSection
        id="language"
        icon={<Globe className="w-5 h-5" />}
        title={translate("settingsPanel.language")}
        expanded={expandedSection === "language"}
        onToggle={toggleSection}
      >
        <LanguageSelector />
      </CollapsibleSection>

      {/* Push Notifications */}
      <CollapsibleSection
        id="notifications"
        icon={<BellRing className="w-5 h-5" />}
        title={translate("settingsPanel.notifications")}
        expanded={expandedSection === "notifications"}
        onToggle={toggleSection}
      >
        <NotificationSettings />
      </CollapsibleSection>

      {/* Parent Notifications */}
      <CollapsibleSection
        id="parentNotifications"
        icon={<Users className="w-5 h-5" />}
        title={translate("settingsPanel.parentNotifications")}
        expanded={expandedSection === "parentNotifications"}
        onToggle={toggleSection}
      >
        <ParentNotificationSettings />
      </CollapsibleSection>

      {/* Tab Order */}
      <CollapsibleSection
        id="tabOrder"
        icon={<LayoutGrid className="w-5 h-5" />}
        title={translate("settingsPanel.tabOrder")}
        expanded={expandedSection === "tabOrder"}
        onToggle={toggleSection}
      >
        <TabOrderEditor />
      </CollapsibleSection>

      {/* Child (Individuen) Order */}
      <CollapsibleSection
        id="childOrder"
        icon={<UserCog className="w-5 h-5" />}
        title={translate("settingsPanel.childOrder")}
        expanded={expandedSection === "childOrder"}
        onToggle={toggleSection}
      >
        <ChildOrderEditor />
      </CollapsibleSection>

      <CollapsibleSection
        id="features"
        icon={<Sliders className="w-5 h-5" />}
        title={translate("settingsPanel.features")}
        expanded={expandedSection === "features"}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={resetFeatureOrder} className="text-xs gap-1">
              <RotateCcw className="w-3 h-3" />
              {translate("compSettingsPanel.resetOrder")}
            </Button>
          </div>
          {(() => {
            const configs: Array<{
              key: string
              label: string
              icon: React.ReactNode
              checked: boolean
            }> = [
              {
                key: "soundEnabled",
                label: translate("compSettingsPanel.soundEffects"),
                icon: state.settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />,
                checked: state.settings.soundEnabled,
              },
              { key: "animationsEnabled", label: translate("compSettingsPanel.animations"), icon: <Sparkles className="w-5 h-5" />, checked: state.settings.animationsEnabled },
              {
                key: "lowSpecPerformanceMode",
                label: translate("compSettingsPanel.lowSpecPerformanceMode"),
                icon: <Smartphone className="w-5 h-5" />,
                checked: state.settings.lowSpecPerformanceMode ?? false,
              },
              { key: "showConfetti", label: translate("compSettingsPanel.confettiEffects"), icon: <Sparkles className="w-5 h-5" />, checked: state.settings.showConfetti },
              { key: "petSystemEnabled", label: translate("compSettingsPanel.petSystem"), icon: <PawPrint className="w-5 h-5" />, checked: state.settings.petSystemEnabled },
              { key: "stickerSystemEnabled", label: translate("compSettingsPanel.stickerAlbum"), icon: <Sticker className="w-5 h-5" />, checked: state.settings.stickerSystemEnabled },
              { key: "weatherEnabled", label: translate("compSettingsPanel.weatherWidget"), icon: <Cloud className="w-5 h-5" />, checked: state.settings.weatherEnabled },
              { key: "moodTrackingEnabled", label: translate("compSettingsPanel.moodTracker"), icon: <Smile className="w-5 h-5" />, checked: state.settings.moodTrackingEnabled },
              { key: "shopEnabled", label: translate("compSettingsPanel.shopRewards"), icon: <ShoppingBag className="w-5 h-5" />, checked: state.settings.shopEnabled ?? true },
              { key: "profileEnabled", label: translate("compSettingsPanel.profilePage"), icon: <User className="w-5 h-5" />, checked: state.settings.profileEnabled ?? true },
              { key: "gamesEnabled", label: translate("compSettingsPanel.gamesMinigames"), icon: <Gamepad2 className="w-5 h-5" />, checked: state.settings.gamesEnabled !== false },
              {
                key: "videosEnabled",
                label: translate("compSettingsPanel.videosGallery"),
                icon: <Film className="w-5 h-5" />,
                checked: state.settings.videosEnabled !== false,
              },
              {
                key: "audioCommunicationEnabled",
                label: translate("compSettingsPanel.audioCommunication"),
                icon: <Mic className="w-5 h-5" />,
                checked: state.settings.audioCommunicationEnabled ?? false,
              },
              {
                key: "sidebarEnabled",
                label: translate("compSettingsPanel.sidebarDesktop"),
                icon: <LayoutGrid className="w-5 h-5" />,
                checked: state.settings.sidebarEnabled !== false,
              },
            ]
            const byKey = new Map(configs.map((c) => [c.key, c]))
            // Fehlende Keys (z. B. neue Features) in die Anzeige-Reihenfolge aufnehmen
            const orderIds = [
              ...featureOrderIds,
              ...configs.map((c) => c.key).filter((k) => !featureOrderIds.includes(k)),
            ]
            const toShow = orderIds.map((key) => byKey.get(key)).filter(Boolean) as typeof configs

            return (
              <>
                <div className="space-y-2">
                  {toShow.map((item) => {
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
                            <span className="text-xs text-muted-foreground">{translate("compSettingsPanel.soundSuccessDescription")}</span>
                          )}
                          {item.key === "lowSpecPerformanceMode" && (
                            <span className="text-xs text-muted-foreground">{translate("compSettingsPanel.lowSpecPerformanceHint")}</span>
                          )}
                          {item.key === "audioCommunicationEnabled" && (
                            <span className="text-xs text-muted-foreground">{translate("compSettingsPanel.audioCommunicationHint")}</span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveFeature(actualIndex, "up")}
                            disabled={actualIndex === 0 || !featureOrderIds.includes(item.key)}
                            aria-label="Nach oben"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveFeature(actualIndex, "down")}
                            disabled={
                              actualIndex === featureOrderIds.length - 1 ||
                              !featureOrderIds.includes(item.key)
                            }
                            aria-label={translate("compSettingsPanel.moveDown")}
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
                    {translate("compSettingsPanel.gamesPageDescription")}{" "}
                    <Link href="/spiele" className="text-primary underline">{translate("compSettingsPanel.openNow")}</Link>
                  </span>
                </div>
              </>
            )
          })()}
        </div>
      </CollapsibleSection>

      {/* Nähe / Mehrspieler (WLAN + optional Bluetooth) */}
      <CollapsibleSection
        id="nearbyGames"
        icon={<Radio className="w-5 h-5" />}
        title={translate("settingsPanel.nearbyGames")}
        expanded={expandedSection === "nearbyGames"}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {translate("compSettingsPanel.nearbyGamesSectionHint")}
          </p>
          <div className="p-3 rounded-xl bg-secondary/50">
            <ToggleRow
              icon={<Wifi className="w-5 h-5" />}
              label={translate("compSettingsPanel.nearbyGamesEnable")}
              description={translate("compSettingsPanel.nearbyGamesHint")}
              checked={state.settings.nearbyGamesEnabled !== false}
              onChange={(v) => updateSetting("nearbyGamesEnabled", v)}
            />
          </div>
          <div
            className={cn(
              "p-3 rounded-xl bg-secondary/50",
              state.settings.nearbyGamesEnabled === false && "opacity-60 pointer-events-none",
            )}
          >
            <ToggleRow
              icon={<Bluetooth className="w-5 h-5" />}
              label={translate("compSettingsPanel.nearbyBluetoothEnable")}
              description={translate("compSettingsPanel.nearbyBluetoothHint")}
              checked={
                state.settings.nearbyGamesEnabled !== false &&
                state.settings.nearbyBluetoothEnabled === true
              }
              onChange={(v) => {
                if (state.settings.nearbyGamesEnabled === false) return
                updateSetting("nearbyBluetoothEnabled", v)
              }}
              disabled={state.settings.nearbyGamesEnabled === false}
            />
          </div>
          <div
            className={cn(
              "p-3 rounded-xl bg-secondary/50 space-y-1",
              state.settings.nearbyGamesEnabled === false && "opacity-60 pointer-events-none",
            )}
          >
            <p className="text-xs font-medium text-foreground mb-1">
              {translate("compSettingsPanel.nearbyGamesPerGame")}
            </p>
            <ToggleRow
              icon={<Gamepad2 className="w-5 h-5" />}
              label={translate("compSettingsPanel.nearbyChessAllow")}
              checked={state.settings.nearbyGamesAllowed?.chess !== false}
              onChange={(v) => updateNearbyGameAllowed("chess", v)}
              disabled={state.settings.nearbyGamesEnabled === false}
            />
            <ToggleRow
              icon={<Gamepad2 className="w-5 h-5" />}
              label={translate("compSettingsPanel.nearbyDameAllow")}
              checked={state.settings.nearbyGamesAllowed?.dame !== false}
              onChange={(v) => updateNearbyGameAllowed("dame", v)}
              disabled={state.settings.nearbyGamesEnabled === false}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* School Time */}
      <CollapsibleSection
        id="schoolTime"
        icon={<GraduationCap className="w-5 h-5" />}
        title={translate("settingsPanel.schoolTime")}
        expanded={expandedSection === "schoolTime"}
        onToggle={toggleSection}
      >
        <SchoolTimeSettings />
      </CollapsibleSection>

      {/* Kiosk-Modus (Kindersperre) – Funktion nur auf Android; Sektion überall sichtbar */}
      <CollapsibleSection
        id="kiosk"
        icon={<Smartphone className="w-5 h-5" />}
        title={translate("settingsPanel.kiosk")}
        expanded={expandedSection === "kiosk"}
        onToggle={toggleSection}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {translate("compSettingsPanel.kioskDescription")}
            {!getPlatform().isAndroid && (
              <span className="block mt-2 text-muted-foreground/80">
                {translate("compSettingsPanel.androidOnly")}
              </span>
            )}
          </p>
          <Button
            type="button"
            variant="default"
            className="w-full gap-2"
            onClick={() => openHomeSettings()}
            disabled={!getPlatform().isNative || !getPlatform().isAndroid}
          >
            <Smartphone className="w-4 h-4" />
            {translate("compSettingsPanel.toggleLock")}
          </Button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="deviceAccess"
        icon={<Shield className="w-5 h-5" />}
        title="Gerätezugriff & Berechtigungen"
        expanded={expandedSection === "deviceAccess"}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Für Play-Store / Familien-Schutz: Standort (auch im Hintergrund), Mikrofon, Kamera, Benachrichtigungen,
            Medien und Kontakte. Android zeigt Hintergrund-Standort erst nach „Während der Nutzung“ – bitte danach
            „Immer erlauben“ wählen.
            {!isCapacitorNativeShell() && (
              <span className="mt-1 block text-muted-foreground/90">
                Voller Zugriff inkl. Hintergrund-Standort nur in der installierten APK.
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              className="w-full justify-start gap-2"
              onClick={() => void requestFullAccess()}
              disabled={!!deviceAccessBusyByKey.full || !isCapacitorNativeShell()}
            >
              <Shield className="w-4 h-4" />
              Alle Berechtigungen anfordern (Vollzugriff)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void requestMicrophoneAccess()}
              disabled={!!deviceAccessBusyByKey.mic}
            >
              <Mic className="w-4 h-4" />
              Mikrofon-Zugriff erneuern
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void requestCameraAccess()}
              disabled={!!deviceAccessBusyByKey.camera}
            >
              <Camera className="w-4 h-4" />
              Kamera-Zugriff erneuern
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void requestGpsAccess()}
              disabled={!!deviceAccessBusyByKey.gps}
            >
              <MapPin className="w-4 h-4" />
              GPS + Hintergrund-Standort erneuern
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void requestPhotoAccess()}
              disabled={!!deviceAccessBusyByKey.photo}
            >
              <Image className="w-4 h-4" />
              Fotozugriff erneuern
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void requestContactsAccess()}
              disabled={!!deviceAccessBusyByKey.contacts}
            >
              <Contact className="w-4 h-4" />
              Kontaktzugriff erneuern
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void handleShowStorage()}
              disabled={!!deviceAccessBusyByKey.storage}
            >
              <FolderOpen className="w-4 h-4" />
              Ordnerzugriff prüfen (Backup-Ordner)
            </Button>
            <Button
              type="button"
              className="w-full justify-start gap-2"
              onClick={() => void openAppPermissionSettings()}
              disabled={!!deviceAccessBusyByKey.settings || !isCapacitorNativeShell()}
            >
              <Settings className="w-4 h-4" />
              Wichtige Geräte-Einstellungen öffnen
            </Button>
          </div>
          {deviceAccessHint && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
              {deviceAccessHint}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Admin PIN */}
      <CollapsibleSection
        id="adminPin"
        icon={<Lock className="w-5 h-5" />}
        title={translate("settingsPanel.adminPin")}
        expanded={expandedSection === "adminPin"}
        onToggle={toggleSection}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-secondary/50">
            <ToggleRow
              icon={adminPinEnabled ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
              label={translate("compSettingsPanel.pinProtectionEnable")}
              checked={adminPinEnabled}
              onChange={(v) => updateSetting("adminPinEnabled", v)}
            />
            <p className="text-xs text-muted-foreground mt-2 ml-8">
              {adminPinEnabled
                ? translate("compSettingsPanel.adminProtectedByPin")
                : translate("compSettingsPanel.adminWithoutPin")}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-secondary/50">
            <ToggleRow
              icon={<Smartphone className="w-5 h-5" />}
              label={translate("compSettingsPanel.backButtonBlockKiosk")}
              checked={backButtonBlockEnabled}
              onChange={(v) => {
                if (getPlatform().isNative && getPlatform().isAndroid) {
                  setBackButtonBlockEnabled(v).then(() => setBackButtonBlockEnabledState(v))
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-2 ml-8">
              {translate("compSettingsPanel.backButtonBlockDescription")}
              {!getPlatform().isAndroid && (
                <span className="block mt-1">{translate("compSettingsPanel.androidOnly")}</span>
              )}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-secondary/50">
            <ToggleRow
              icon={<Scale className="w-5 h-5" />}
              label={translate("compSettingsPanel.ruleApprovalsEnable")}
              checked={state.settings?.requireRuleApprovalGlobal ?? false}
              onChange={(v) => updateSetting("requireRuleApprovalGlobal", v)}
            />
            <p className="text-xs text-muted-foreground mt-2 ml-8">
              {translate("compSettingsPanel.ruleApprovalsDescription")}
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
                    placeholder={translate("compSettingsPanel.newPinPlaceholder")}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder={translate("compSettingsPanel.confirmPinPlaceholder")}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                  {pinError && <p className="text-sm text-destructive">{pinError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={handlePinChange} className="flex-1 rounded-xl">
                      <Check className="w-4 h-4 mr-2" />
                      {t.common?.save ?? "Speichern"}
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
                  {translate("compSettingsPanel.changePin")}
                </Button>
              )}
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Cloud-Sync (Geräte verbinden) – immer sichtbar; Inhalt zeigt Sync-Code oder Hinweis bei fehlender Konfiguration */}
      <CollapsibleSection
        id="cloudSync"
        icon={<Cloud className="w-5 h-5" />}
        title={translate("settingsPanel.cloudSync")}
        expanded={expandedSection === "cloudSync"}
        onToggle={toggleSection}
      >
        <CloudSyncPanel />
        <LocalNetworkSyncPanel />
      </CollapsibleSection>

      {showParentGpsOverview && (
        <CollapsibleSection
          id="locationOverview"
          icon={<MapPin className="w-5 h-5" />}
          title="Standort & ACK Übersicht"
          expanded={expandedSection === "locationOverview"}
          onToggle={toggleSection}
        >
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Gesamtübersicht für Standort-Signale, automatische Empfangsbestätigungen (ACK) und Warnstatus.
            </p>
            <div className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">Live-Standort Steuerung</p>
              <ToggleRow
                icon={<MapPin className="w-4 h-4" />}
                label="Live-Standort aktivieren"
                checked={state.settings.childLocationLiveEnabled === true}
                onChange={(v) => updateSetting("childLocationLiveEnabled", v)}
              />
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Live-Intervall (Sekunden)</span>
                <select
                  value={state.settings.childLocationLiveIntervalSeconds ?? 15}
                  onChange={(e) => setLiveIntervalSeconds(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                >
                  {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((v) => (
                    <option key={v} value={v}>
                      {v}s
                    </option>
                  ))}
                </select>
              </label>
              <ToggleRow
                icon={<MapPin className="w-4 h-4" />}
                label="Manuellen 'Jetzt senden'-Button erlauben"
                checked={state.settings.childLocationLiveManualSendEnabled !== false}
                onChange={(v) => updateSetting("childLocationLiveManualSendEnabled", v)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void triggerManualLiveLocationSend()}
              >
                Jetzt Live-Standort senden (Test)
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Auf dem Kind-Gerät: echter Live-Send. Hier (Eltern/Master): schreibt einen Test-Standort für das
                ausgewählte Kind – funktioniert auch in der APK.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                Grün = stabil
              </span>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                Gelb = beobachten
              </span>
              <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-red-700 dark:text-red-300">
                Rot = Aktion nötig
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-background/40 p-2">
                <p className="text-[11px] text-muted-foreground">Kinder</p>
                <p className="text-sm font-semibold text-foreground">{locationOverview.totalChildren}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-2">
                <p className="text-[11px] text-muted-foreground">Mit Standort</p>
                <p className="text-sm font-semibold text-foreground">{locationOverview.childrenWithAnyLocation}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-2">
                <p className="text-[11px] text-muted-foreground">ACK heute</p>
                <p className="text-sm font-semibold text-foreground">{locationOverview.ackToday}</p>
              </div>
              <div className={cn("rounded-lg border bg-background/40 p-2", locationHealth.pendingClass)}>
                <p className="text-[11px] text-muted-foreground">ACK ausstehend</p>
                <p className="text-sm font-semibold text-foreground">{locationOverview.pendingAckNow}</p>
              </div>
            </div>

            <div className={cn("rounded-lg border bg-background/40 p-2 text-[11px] text-muted-foreground space-y-1", locationHealth.warningClass)}>
              <p>
                Letztes ACK:{" "}
                <span className="text-foreground font-medium">
                  {locationOverview.lastAckAt
                    ? new Date(locationOverview.lastAckAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "noch keines"}
                </span>
              </p>
              <p>
                Gesamt ACK-Historie:{" "}
                <span className="text-foreground font-medium">{locationOverview.totalAckEntries}</span>
              </p>
              <p>
                GPS-Warnung:{" "}
                <span className="text-foreground font-medium">
                  {(state.settings.childLocationGpsWarningActive ?? false) ? "aktiv" : "inaktiv"}
                  {(state.settings.childLocationGpsWarningSticky ?? false) ? " (sticky)" : ""}
                </span>
              </p>
              <p className={cn("rounded px-1.5 py-1", locationHealth.feedbackClass)}>
                Fehlende Feedbacks:{" "}
                <span className="text-foreground font-medium">
                  {state.settings.childLocationGpsFailureCount ?? 0}
                </span>
              </p>
            </div>

            <ParentGpsOverviewDialogTrigger fullWidth className="rounded-xl" />
          </div>
        </CollapsibleSection>
      )}

      {/* Backup */}
      <CollapsibleSection
        id="backup"
        icon={<Database className="w-5 h-5" />}
        title={translate("settingsPanel.backup")}
        expanded={expandedSection === "backup"}
        onToggle={toggleSection}
      >
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border-2 border-primary/20 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{translate("compSettingsPanel.downloadAllData")}</h3>
              <p className="text-xs text-muted-foreground">
                {translate("compSettingsPanel.downloadAllDataDescription")}
              </p>
            </div>
          </div>
          <Button onClick={handleQuickExport} className="w-full rounded-xl gap-2">
            <Database className="w-4 h-4" />
            {translate("compSettingsPanel.downloadNow")}
          </Button>
          {isExportLocationChoiceSupported() && (
            <div className="mt-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2">
              <ToggleRow
                icon={<FolderOpen className="w-4 h-4" />}
                label={translate("compSettingsPanel.chooseLocationLabel")}
                description={
                  isNativeApp()
                    ? translate("compSettingsPanel.chooseLocationHintNative")
                    : isSaveFilePickerSupported()
                      ? translate("compSettingsPanel.pcBackupTip")
                      : translate("compSettingsPanel.chooseLocationHint")
                }
                checked={exportChooseLocation}
                onChange={setExportChooseLocation}
              />
            </div>
          )}
          {isNativeApp() ? (
            <div className="mt-3 space-y-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2">
              <ToggleRow
                icon={<Database className="w-4 h-4" />}
                label={translate("compSettingsPanel.dailyBackupLocal")}
                description={translate("compSettingsPanel.dailyBackupHint")}
                checked={dailyBackupEnabled}
                onChange={handleDailyBackupToggle}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleShowStorage}
                disabled={!!deviceAccessBusyByKey.storage}
              >
                <FolderSearch className="w-4 h-4" />
                {translate("compSettingsPanel.viewStorageLocation")}
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {translate("compSettingsPanel.dailyBackupHintOff")}
            </p>
          )}
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-left">
            <div className="mb-2 flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <p className="text-xs font-semibold text-foreground">
                {translate("compSettingsPanel.emergencyBackupTitle")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{translate("compSettingsPanel.emergencyBackupIntro")}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[11px] text-muted-foreground">
              <li>
                {translate("compSettingsPanel.emergencyBackupWeb", { storageKey: EMERGENCY_BACKUP_LS_KEY })}
              </li>
              <li>
                {translate("compSettingsPanel.emergencyBackupNative", { folder: BACKUP_FOLDER_DISPLAY_PATH })}
              </li>
            </ul>
          </div>
        </section>
        <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderSearch className="w-5 h-5" />
                {translate("compSettingsPanel.viewStorageLocation")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {translate("compSettingsPanel.viewStorageLocation")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-muted-foreground">
              {storageInfo ? (
                <>
                  <div className="mt-2 font-medium text-foreground">
                    {translate("compSettingsPanel.folderLabel")}
                  </div>
                  <div className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">
                    {storageInfo.path}
                  </div>
                  <div className="mt-3 font-medium text-foreground">
                    {storageInfo.files.length > 0
                      ? translate("compSettingsPanel.backupFilesLabel")
                      : translate("compSettingsPanel.noBackupFiles")}
                  </div>
                  {storageInfo.files.length > 0 && (
                    <ul className="fdt-scroll max-h-48 space-y-1 overflow-y-auto rounded-lg bg-muted px-3 py-2 text-sm">
                      {storageInfo.files.map((name) => (
                        <li key={name} className="break-all font-mono text-xs">
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <span>{translate("compSettingsPanel.loading")}</span>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <SettingsBackup chooseLocation={exportChooseLocation} />
      </CollapsibleSection>

      {/* Developer Options – nur für Eltern/Master */}
      {showDeveloperOptions && (
        <CollapsibleSection
          id="developer"
          icon={<Code className="w-5 h-5" />}
          title={translate("settingsPanel.developer")}
          expanded={expandedSection === "developer"}
          onToggle={toggleSection}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Crown className="h-4 w-4 text-amber-500" />
                Master-Modus
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                Master darf erweiterte Verwaltungsaktionen ausführen.
              </p>
              {deviceRole === "master" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setShowMasterPinInput(false)
                    setMasterPinInput("")
                    setMasterPinError("")
                    void setDeviceRole("parent")
                  }}
                >
                  <Crown className="h-4 w-4" />
                  Master deaktivieren (zurück zu Eltern)
                </Button>
              ) : (
                <div className="space-y-2">
                  {showMasterPinInput ? (
                    <>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={3}
                        value={masterPinInput}
                        disabled={masterPinLocked}
                        onChange={(e) => {
                          setMasterPinInput(e.target.value.replace(/\D/g, "").slice(0, 3))
                          if (masterPinError) setMasterPinError("")
                        }}
                        placeholder="Master-PIN (369)"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      />
                      {masterPinLocked && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Sicherheits-Sperre aktiv: noch {masterPinLockRemainingSec}s.
                        </p>
                      )}
                      {masterPinError && <p className="text-xs text-destructive">{masterPinError}</p>}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 gap-2"
                          onClick={handleActivateMaster}
                          disabled={masterPinLocked}
                        >
                          <Crown className="h-4 w-4" />
                          Bestätigen
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowMasterPinInput(false)
                            setMasterPinInput("")
                            setMasterPinError("")
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button type="button" className="w-full gap-2" onClick={() => setShowMasterPinInput(true)}>
                      <Crown className="h-4 w-4" />
                      Master aktivieren
                    </Button>
                  )}
                </div>
              )}
            </div>
            <ChildLocationShareBlock />
            <DeveloperLogPanel />
            <CapacitorInfoBlock />
            <TestDataLoader />
          </div>
        </CollapsibleSection>
      )}

      {/* App Info – Fensterbereich Version & Update */}
      <section className="py-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <AppUpdateBlock />
          <div className="flex flex-col items-center gap-3 text-center">
            <VersionBadge />
            <p className="text-xs text-muted-foreground">{translate("compSettingsPanel.madeWithLove")}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-2", disabled && "opacity-60")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-snug text-foreground">{label}</span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {description}
            </span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          onChange(!checked)
        }}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors
          ${checked ? "bg-primary" : "bg-secondary"}
          ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform
            ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  )
}
