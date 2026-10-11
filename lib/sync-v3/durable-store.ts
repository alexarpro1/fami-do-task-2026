import type { PersistedSyncState } from "./types"

const DEFAULT_STORAGE_KEY = "famiapp-sync-v3"
const DB_NAME = "famiapp_sync_v3"
const DB_VERSION = 1
const STORE_NAME = "snapshots"

export interface SyncStateStore {
  load(): Promise<PersistedSyncState | null>
  save(state: PersistedSyncState): Promise<void>
}

function parseState(raw: string | null): PersistedSyncState | null {
  if (!raw) return null
  try {
    const state = JSON.parse(raw) as Partial<PersistedSyncState>
    if (
      state.schemaVersion !== 1 ||
      !Array.isArray(state.queue) ||
      !state.entities ||
      !Array.isArray(state.seenEventIds)
    ) {
      return null
    }
    return state as PersistedSyncState
  } catch {
    return null
  }
}

function selectNewest(states: Array<PersistedSyncState | null>): PersistedSyncState | null {
  return states.reduce<PersistedSyncState | null>((newest, candidate) => {
    if (!candidate) return newest
    if (!newest || candidate.generation > newest.generation) return candidate
    return newest
  }, null)
}

function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean }
  }).Capacitor
  return capacitor?.isNativePlatform?.() ?? !!capacitor
}

function readLocalStorage(key: string): PersistedSyncState | null {
  try {
    return typeof localStorage === "undefined" ? null : parseState(localStorage.getItem(key))
  } catch {
    return null
  }
}

function writeLocalStorage(key: string, raw: string): void {
  if (typeof localStorage === "undefined") throw new Error("localStorage unavailable")
  localStorage.setItem(key, raw)
}

async function readPreferences(key: string): Promise<PersistedSyncState | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const result = await Preferences.get({ key })
    return parseState(result.value)
  } catch {
    return null
  }
}

async function writePreferences(key: string, raw: string): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences")
  await Preferences.set({ key, value: raw })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"))
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function readIndexedDb(key: string): Promise<PersistedSyncState | null> {
  let db: IDBDatabase | undefined
  try {
    db = await openDatabase()
    const raw = await new Promise<string | null>((resolve, reject) => {
      const request = db!.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () =>
        resolve(typeof request.result === "string" ? request.result : null)
    })
    return parseState(raw)
  } catch {
    return null
  } finally {
    db?.close()
  }
}

async function writeIndexedDb(key: string, raw: string): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB aborted"))
      transaction.oncomplete = () => resolve()
      transaction.objectStore(STORE_NAME).put(raw, key)
    })
  } finally {
    db.close()
  }
}

/**
 * Writes every snapshot to two independent stores. On reload, the snapshot
 * with the highest generation wins, so an interrupted mirror write cannot
 * roll the queue back.
 */
export class BrowserDurableSyncStore implements SyncStateStore {
  constructor(private readonly key = DEFAULT_STORAGE_KEY) {}

  async load(): Promise<PersistedSyncState | null> {
    const local = readLocalStorage(this.key)
    const primary = isNativeRuntime()
      ? await readPreferences(this.key)
      : await readIndexedDb(this.key)
    return selectNewest([primary, local])
  }

  async save(state: PersistedSyncState): Promise<void> {
    const raw = JSON.stringify(state)
    const writes: Array<Promise<unknown>> = [
      Promise.resolve().then(() => writeLocalStorage(this.key, raw)),
      isNativeRuntime()
        ? writePreferences(this.key, raw)
        : writeIndexedDb(this.key, raw),
    ]
    const results = await Promise.allSettled(writes)
    if (results.every((result) => result.status === "rejected")) {
      throw new AggregateError(
        results.map((result) =>
          result.status === "rejected" ? result.reason : undefined,
        ),
        "Sync queue could not be persisted",
      )
    }
  }
}

/** Deterministic durable-store substitute for tests and non-browser adapters. */
export class MemorySyncStore implements SyncStateStore {
  private state: PersistedSyncState | null

  constructor(initial?: PersistedSyncState | null) {
    this.state = initial ? structuredClone(initial) : null
  }

  async load(): Promise<PersistedSyncState | null> {
    return this.state ? structuredClone(this.state) : null
  }

  async save(state: PersistedSyncState): Promise<void> {
    this.state = structuredClone(state)
  }
}
