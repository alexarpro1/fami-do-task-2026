"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Download,
  Upload,
  Settings,
  Database,
  Check,
  AlertTriangle,
  X,
  Users,
  ListTodo,
  Gift,
  Scale,
  ChevronDown,
  ChevronUp,
  PawPrint,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFamily } from "@/context/family-context"
import type { AppSettings, FamilyState } from "@/types"
import {
  importBackupWithMigration,
  validateBackup,
  type ImportOptions,
  type MergeOption,
  DEFAULT_IMPORT_OPTIONS,
} from "@/lib/backup-migration"
import { APP_VERSION } from "@/lib/version"

type BackupType = "settings" | "data" | "all"

interface SettingsBackup {
  type: "settings"
  version: string
  exportedAt: string
  settings: AppSettings
}

interface DataBackup {
  type: "data"
  version: string
  exportedAt: string
  children: FamilyState["children"]
  tasks: FamilyState["tasks"]
  rewards: FamilyState["rewards"]
  rules: FamilyState["rules"]
  pets: FamilyState["pets"]
}

interface FullBackup {
  type: "all"
  version: string
  exportedAt: string
  state: FamilyState
}

type Backup = SettingsBackup | DataBackup | FullBackup

const APP_VERSION_STRING = APP_VERSION.full

function MergeOptionSelector({
  label,
  icon,
  currentItems,
  backupItems,
  value,
  onChange,
  disabled,
  renderItem,
}: {
  label: string
  icon: React.ReactNode
  currentItems: any[]
  backupItems: any[]
  value: MergeOption
  onChange: (value: MergeOption) => void
  disabled?: boolean
  renderItem: (item: any) => { name: string; detail?: string; emoji?: string }
}) {
  const [expanded, setExpanded] = useState(false)

  if (disabled || backupItems.length === 0) {
    return null
  }

  return (
    <div className="bg-secondary/30 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-2 hover:bg-secondary/50 transition-colors"
      >
        {icon}
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs text-muted-foreground ml-auto mr-2">
          Aktuell: {currentItems.length} | Backup: {backupItems.length}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Current Items Preview */}
              {currentItems.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Aktuell in der App:</p>
                  <div className="bg-background/50 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                    {currentItems.slice(0, 10).map((item, i) => {
                      const rendered = renderItem(item)
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {rendered.emoji && <span>{rendered.emoji}</span>}
                          <span className="font-medium truncate">{rendered.name}</span>
                          {rendered.detail && (
                            <span className="text-muted-foreground ml-auto text-[10px]">{rendered.detail}</span>
                          )}
                        </div>
                      )
                    })}
                    {currentItems.length > 10 && (
                      <p className="text-[10px] text-muted-foreground">...und {currentItems.length - 10} weitere</p>
                    )}
                  </div>
                </div>
              )}

              {/* Backup Items Preview */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Im Backup:</p>
                <div className="bg-background/50 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                  {backupItems.slice(0, 10).map((item, i) => {
                    const rendered = renderItem(item)
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {rendered.emoji && <span>{rendered.emoji}</span>}
                        <span className="font-medium truncate">{rendered.name}</span>
                        {rendered.detail && (
                          <span className="text-muted-foreground ml-auto text-[10px]">{rendered.detail}</span>
                        )}
                      </div>
                    )
                  })}
                  {backupItems.length > 10 && (
                    <p className="text-[10px] text-muted-foreground">...und {backupItems.length - 10} weitere</p>
                  )}
                </div>
              </div>

              {/* Merge Options */}
              <div className="grid grid-cols-3 gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => onChange("keep-current")}
                  className={`px-2 py-1.5 text-xs rounded-lg transition-all ${
                    value === "keep-current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  Behalten
                </button>
                <button
                  type="button"
                  onClick={() => onChange("use-backup")}
                  className={`px-2 py-1.5 text-xs rounded-lg transition-all ${
                    value === "use-backup" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  Ersetzen
                </button>
                <button
                  type="button"
                  onClick={() => onChange("merge-both")}
                  className={`px-2 py-1.5 text-xs rounded-lg transition-all ${
                    value === "merge-both" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  Zusammenfuehren
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function extractBackupItems(data: any) {
  // New format
  if (data.type === "all" && data.state) {
    return {
      children: data.state.children || [],
      tasks: data.state.tasks || [],
      rewards: data.state.rewards || [],
      rules: data.state.rules || [],
      pets: data.state.pets || [],
    }
  }
  if (data.type === "data") {
    return {
      children: data.children || [],
      tasks: data.tasks || [],
      rewards: data.rewards || [],
      rules: data.rules || [],
      pets: data.pets || [],
    }
  }
  // Legacy format
  if (data.users) {
    return {
      children: data.users.map((u: any) => ({
        name: u.name,
        points: u.score || 0,
        avatar: u.avatar,
      })),
      tasks: data.tasks || [],
      rewards: data.rewards || [],
      rules: data.rules || [],
      pets: [],
    }
  }
  return { children: [], tasks: [], rewards: [], rules: [], pets: [] }
}

export function SettingsBackup() {
  const { state, dispatch } = useFamily()
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [isMigrated, setIsMigrated] = useState(false)
  const [importOptions, setImportOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS)
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateBackup> | null>(null)
  const [backupItems, setBackupItems] = useState<ReturnType<typeof extractBackupItems> | null>(null)

  const exportBackup = (type: "settings" | "data" | "all") => {
    const now = new Date().toISOString()
    let backup: any
    let filename: string

    switch (type) {
      case "settings":
        backup = {
          type: "settings",
          version: APP_VERSION_STRING,
          exportedAt: now,
          settings: state.settings,
        }
        filename = `famiapp-settings-v${APP_VERSION_STRING}-${new Date().toLocaleDateString("de-DE").replace(/\./g, "-")}.json`
        break
      case "data":
        backup = {
          type: "data",
          version: APP_VERSION_STRING,
          exportedAt: now,
          children: state.children,
          tasks: state.tasks,
          rewards: state.rewards,
          rules: state.rules,
          pets: state.pets,
        }
        filename = `famiapp-data-v${APP_VERSION_STRING}-${new Date().toLocaleDateString("de-DE").replace(/\./g, "-")}.json`
        break
      case "all":
        backup = {
          type: "all",
          version: APP_VERSION_STRING,
          exportedAt: now,
          state: state,
        }
        filename = `famiapp-backup-v${APP_VERSION_STRING}-${new Date().toLocaleDateString("de-DE").replace(/\./g, "-")}.json`
        break
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError(null)
    setImportSuccess(false)
    setImportWarnings([])
    setIsMigrated(false)
    setImportOptions(DEFAULT_IMPORT_OPTIONS)
    setValidationResult(null)
    setBackupItems(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        const validation = validateBackup(data)
        setValidationResult(validation)
        setImportData(data)
        setBackupItems(extractBackupItems(data))
        setShowImportModal(true)

        if (!validation.isValid) {
          setImportError(validation.errors.join("; "))
        }
      } catch (error) {
        setImportError("Fehler beim Lesen der Datei. Ungültiges JSON-Format.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const confirmImport = () => {
    if (!importData) return

    const result = importBackupWithMigration(importData, state, importOptions)

    if (!result.success) {
      setImportError(result.error || "Unbekannter Fehler beim Importieren")
      return
    }

    if (result.state) {
      dispatch({ type: "LOAD_STATE", payload: result.state })

      try {
        window.localStorage.setItem("famiapp-state", JSON.stringify(result.state))
      } catch (e) {
        console.error("Failed to save to localStorage:", e)
      }

      setImportWarnings(result.warnings || [])
      setIsMigrated(result.migrated || false)
      setImportSuccess(true)

      setTimeout(() => {
        setShowImportModal(false)
        setImportData(null)
        setImportSuccess(false)
        setImportWarnings([])
        setIsMigrated(false)
        setValidationResult(null)
        setBackupItems(null)
      }, 3000)
    }
  }

  const closeModal = () => {
    setShowImportModal(false)
    setImportData(null)
    setImportError(null)
    setValidationResult(null)
    setBackupItems(null)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-foreground">Backup & Wiederherstellung</h3>

      {/* Export Section */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Exportieren</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => exportBackup("settings")}
            className="flex items-center gap-2 justify-start"
          >
            <Settings className="w-4 h-4" />
            <span>Einstellungen</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportBackup("data")}
            className="flex items-center gap-2 justify-start"
          >
            <Database className="w-4 h-4" />
            <span>Daten</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportBackup("all")}
            className="flex items-center gap-2 justify-start"
          >
            <Download className="w-4 h-4" />
            <span>Alles</span>
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Importieren</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
          <Button variant="outline" className="w-full bg-transparent" asChild>
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Backup-Datei auswählen
            </span>
          </Button>
        </label>
        {importError && !showImportModal && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {importError}
          </p>
        )}
      </div>

      {/* Import Confirmation Modal */}
      <AnimatePresence>
        {showImportModal && importData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => !importSuccess && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-4 sm:p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
            >
              {importSuccess ? (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-8 h-8 text-white" />
                  </motion.div>
                  <p className="font-semibold text-lg mb-2">Import erfolgreich!</p>
                  {isMigrated && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-2">
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Altes Backup wurde automatisch konvertiert
                      </p>
                    </div>
                  )}
                  {importWarnings.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
                      {importWarnings.map((warning, i) => (
                        <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-foreground">Import bestätigen</h3>
                    <button onClick={closeModal} className="p-1 hover:bg-secondary rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    {/* Backup Info */}
                    {validationResult && (
                      <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Format</span>
                          <span className="font-medium text-sm">
                            {validationResult.format === "new"
                              ? "Neues Format"
                              : validationResult.format === "legacy"
                                ? "Altes Format (wird konvertiert)"
                                : "Unbekannt"}
                          </span>
                        </div>
                        {importData.exportedAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Erstellt am</span>
                            <span className="font-medium text-sm">
                              {new Date(importData.exportedAt).toLocaleString("de-DE")}
                            </span>
                          </div>
                        )}
                        {importData.version && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Version</span>
                            <span className="font-medium text-sm">v{importData.version}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Migration Notice for Legacy */}
                    {validationResult?.format === "legacy" && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                          Altes Backup-Format erkannt
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Das Backup wird automatisch in das neue Format konvertiert.
                        </p>
                      </div>
                    )}

                    {/* Error Display */}
                    {importError && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                        <p className="text-sm font-medium text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Fehler
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{importError}</p>
                      </div>
                    )}

                    {validationResult && validationResult.isValid && importData.type !== "settings" && backupItems && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Import-Optionen</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Klicke auf eine Kategorie, um die Details zu sehen und wähle dann die gewünschte Option.
                        </p>

                        <MergeOptionSelector
                          label="Kinder"
                          icon={<Users className="w-4 h-4 text-blue-500" />}
                          currentItems={state.children}
                          backupItems={backupItems.children}
                          value={importOptions.mergeChildren}
                          onChange={(v) => setImportOptions((prev) => ({ ...prev, mergeChildren: v }))}
                          renderItem={(item) => ({
                            name: item.name,
                            detail: `${item.points ?? item.score ?? 0} Punkte`,
                            emoji: item.avatar,
                          })}
                        />

                        <MergeOptionSelector
                          label="Aufgaben"
                          icon={<ListTodo className="w-4 h-4 text-green-500" />}
                          currentItems={state.tasks}
                          backupItems={backupItems.tasks}
                          value={importOptions.mergeTasks}
                          onChange={(v) => setImportOptions((prev) => ({ ...prev, mergeTasks: v }))}
                          renderItem={(item) => ({
                            name: item.title || item.name || "Unbenannt",
                            detail: `${item.points || 0} Pkt`,
                            emoji: item.icon || item.emoji,
                          })}
                        />

                        <MergeOptionSelector
                          label="Belohnungen"
                          icon={<Gift className="w-4 h-4 text-purple-500" />}
                          currentItems={state.rewards}
                          backupItems={backupItems.rewards}
                          value={importOptions.mergeRewards}
                          onChange={(v) => setImportOptions((prev) => ({ ...prev, mergeRewards: v }))}
                          renderItem={(item) => ({
                            name: item.title || item.name || "Unbenannt",
                            detail: `${item.cost || item.points || 0} Pkt`,
                            emoji: item.icon || item.emoji,
                          })}
                        />

                        <MergeOptionSelector
                          label="Regeln"
                          icon={<Scale className="w-4 h-4 text-orange-500" />}
                          currentItems={state.rules}
                          backupItems={backupItems.rules}
                          value={importOptions.mergeRules}
                          onChange={(v) => setImportOptions((prev) => ({ ...prev, mergeRules: v }))}
                          renderItem={(item) => ({
                            name: item.title || item.name || "Unbenannt",
                            detail: `${item.points > 0 ? "+" : ""}${item.points || 0} Pkt`,
                            emoji: item.icon || item.emoji,
                          })}
                        />

                        {(backupItems.pets?.length > 0 || state.pets?.length > 0) && (
                          <MergeOptionSelector
                            label="Haustiere"
                            icon={<PawPrint className="w-4 h-4 text-pink-500" />}
                            currentItems={state.pets || []}
                            backupItems={backupItems.pets || []}
                            value={importOptions.mergePets || "use-backup"}
                            onChange={(v) => setImportOptions((prev) => ({ ...prev, mergePets: v }))}
                            renderItem={(item) => ({
                              name: item.name || "Haustier",
                              detail: `Level ${item.level || 1}`,
                              emoji: item.type === "cat" ? "🐱" : item.type === "dog" ? "🐶" : "🐰",
                            })}
                          />
                        )}
                      </div>
                    )}

                    {/* Settings-only notice */}
                    {importData.type === "settings" && (
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">
                          Nur Einstellungen werden importiert. Kinder, Aufgaben, Belohnungen und Regeln bleiben
                          unveraendert.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={closeModal} className="flex-1 bg-transparent">
                      Abbrechen
                    </Button>
                    <Button
                      onClick={confirmImport}
                      className="flex-1"
                      disabled={!!importError || !validationResult?.isValid}
                    >
                      Importieren
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
