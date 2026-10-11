/**
 * Export einer Datei (z. B. Backup-JSON) – funktioniert im Browser und in der nativen App (Capacitor).
 * Im Web: Download, Web Share oder Speicherort-Dialog (File System Access API). In der App: Share-Dialog.
 */

import { isNativeApp } from "./device"

export type ExportOptions = {
  /** Wenn true: Im Web Speicherort-Dialog anzeigen (wo unterstützt). In der App: Share-Dialog. */
  chooseLocation?: boolean
}

/** Prüft, ob der Browser „Speicherort wählen“ (showSaveFilePicker) unterstützt (typisch Desktop Chrome/Edge). */
export function isSaveFilePickerSupported(): boolean {
  if (typeof window === "undefined") return false
  return "showSaveFilePicker" in window && typeof (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker === "function"
}

/** Prüft, ob der Browser Web Share (Dateien teilen) unterstützt – typisch Handy/Tablet. */
export function isWebShareSupported(): boolean {
  if (typeof navigator === "undefined") return false
  if (!navigator.share) return false
  try {
    const f = new File([], "test.json", { type: "application/json" })
    return navigator.canShare ? navigator.canShare({ files: [f] }) : true
  } catch {
    return false
  }
}

/** True, wenn Nutzer beim Export Speicherort/App wählen kann (Desktop: Ordner-Dialog, Handy/Tablet: Teilen-Dialog). */
export function isExportLocationChoiceSupported(): boolean {
  return isSaveFilePickerSupported() || isWebShareSupported()
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(",")[1]
      resolve(base64 ?? "")
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Exportiert einen Blob als Datei. Im Browser: Download, Web Share oder Speicherort-Dialog (bei chooseLocation).
 * In der App: Share-Dialog („Speichern“ o. ä.).
 */
export async function exportBlobAsFile(blob: Blob, filename: string, options?: ExportOptions): Promise<void> {
  if (typeof window === "undefined") return

  const chooseLocation = options?.chooseLocation === true

  if (isNativeApp()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem")
      const { Share } = await import("@capacitor/share")
      const base64 = await blobToBase64(blob)
      const path = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
      const result = await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Cache,
      })
      await Share.share({
        url: result.uri,
        title: filename,
        dialogTitle: "Backup speichern",
      })
    } catch (e) {
      // Share API oft in Browser/WebView nicht verfügbar – dann Download ohne Fehler
      const msg = e instanceof Error ? e.message : String(e)
      if (!/share.*not available|not available in this browser/i.test(msg)) {
        console.warn("[export-file] Native Share nicht verfügbar, Download wird verwendet:", msg)
      }
      fallbackDownload(blob, filename)
    }
    return
  }

  // Web: Bei chooseLocation zuerst Speicherort-Dialog (Desktop) oder Teilen-Dialog (Handy/Tablet)
  if (chooseLocation) {
    if (isSaveFilePickerSupported()) {
      try {
        const showSave = (window as unknown as { showSaveFilePicker: (o?: { suggestedName?: string; types?: { description?: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker
        const handle = await showSave({
          suggestedName: filename,
          types: [{ description: "JSON Backup", accept: { "application/json": [".json"] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          console.warn("[export-file] showSaveFilePicker fehlgeschlagen:", e.message)
        }
      }
    }
    // Handy/Tablet: Teilen-Dialog – Nutzer wählt App/Speicherort (z. B. „In Dateien speichern“, Drive)
    if (isWebShareSupported()) {
      try {
        const file = new File([blob], filename, { type: blob.type || "application/json" })
        await navigator.share({
          files: [file],
          title: filename,
          text: "FamiDo Backup",
        })
        return
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          console.warn("[export-file] Web Share fehlgeschlagen:", e.message)
        }
      }
    }
  }

  // Web: ohne chooseLocation optional Web Share (mobil), sonst Download
  if (!chooseLocation && isWebShareSupported()) {
    try {
      const file = new File([blob], filename, { type: blob.type || "application/octet-stream" })
      await navigator.share({
        files: [file],
        title: filename,
        text: "FamiDo Backup",
      })
      return
    } catch {
      // User hat abgebrochen oder Share fehlgeschlagen → Download
    }
  }

  fallbackDownload(blob, filename)
}

function fallbackDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 200)
}
