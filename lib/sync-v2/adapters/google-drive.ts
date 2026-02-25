/**
 * sync-v2 – Google-Drive-Adapter für Sync/Backup.
 * Verwendet eine feste Datei "famiapp-sync.json" im Ordner "FamiDo" (überschreiben = Sync).
 */

import type { SyncAdapter } from "./types"
import type { SyncPayload } from "../types"

const FOLDER_NAME = "FamiDo"
const SYNC_FILE_NAME = "famiapp-sync.json"

async function ensureFolder(accessToken: string): Promise<string> {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!searchRes.ok) throw new Error("Drive: Ordner suchen fehlgeschlagen")
  const searchData = await searchRes.json()
  if (searchData.files?.length > 0) return searchData.files[0].id
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  })
  if (!createRes.ok) throw new Error("Drive: Ordner erstellen fehlgeschlagen")
  const createData = await createRes.json()
  return createData.id
}

/**
 * Erstellt den Google-Drive-Adapter. getAccessToken soll den aktuellen OAuth-Token liefern
 * (z.B. aus sessionStorage nach Verbindung über die bestehende Google-Drive-UI).
 */
export function createGoogleDriveSyncAdapter(
  getAccessToken: () => string | null,
): SyncAdapter {
  return {
    async push(payload: SyncPayload): Promise<{ ok: boolean; error?: string }> {
      const token = getAccessToken()
      if (!token) return { ok: false, error: "Google Drive nicht verbunden. Bitte zuerst verbinden." }
      try {
        const folderId = await ensureFolder(token)
        const listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name='${SYNC_FILE_NAME}'&fields=files(id)`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!listRes.ok) throw new Error("Drive: Dateien auflisten fehlgeschlagen")
        const listData = await listRes.json()
        const body = JSON.stringify(payload)
        if (listData.files?.length > 0) {
          const fileId = listData.files[0].id
          const updateRes = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body,
            },
          )
          if (!updateRes.ok) throw new Error("Drive: Aktualisieren fehlgeschlagen")
        } else {
          const createRes = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: (() => {
                const meta = new Blob(
                  [JSON.stringify({ name: SYNC_FILE_NAME, parents: [folderId] })],
                  { type: "application/json" },
                )
                const file = new Blob([body], { type: "application/json" })
                const form = new FormData()
                form.append("metadata", meta)
                form.append("file", file)
                return form
              })(),
            },
          )
          if (!createRes.ok) throw new Error("Drive: Hochladen fehlgeschlagen")
        }
        return { ok: true }
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Google Drive Fehler" }
      }
    },

    async pull(): Promise<{
      ok: boolean
      payload?: SyncPayload
      error?: string
    }> {
      const token = getAccessToken()
      if (!token) return { ok: false, error: "Google Drive nicht verbunden." }
      try {
        const folderRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'&fields=files(id)`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!folderRes.ok) throw new Error("Drive: Ordner nicht gefunden")
        const folderData = await folderRes.json()
        if (!folderData.files?.length) return { ok: true }
        const folderId = folderData.files[0].id
        const listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name='${SYNC_FILE_NAME}'&fields=files(id)`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!listRes.ok) throw new Error("Drive: Dateien auflisten fehlgeschlagen")
        const listData = await listRes.json()
        if (!listData.files?.length) return { ok: true }
        const fileId = listData.files[0].id
        const contentRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!contentRes.ok) throw new Error("Drive: Download fehlgeschlagen")
        const payload = (await contentRes.json()) as SyncPayload
        if (!payload?.family || !payload?.meta) return { ok: true }
        return { ok: true, payload }
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Google Drive Fehler" }
      }
    },
  }
}
