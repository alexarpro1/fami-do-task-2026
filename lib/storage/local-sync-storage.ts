// Local storage implementation for sync tokens (replaces Supabase sync_tokens table)
// Uses IndexedDB for larger data, falls back to localStorage for smaller data

interface SyncToken {
  id: string
  token: string
  device_id: string
  device_name: string
  data: any
  created_at: string
  expires_at: string
  version: string
}

const DB_NAME = "famiapp_sync_db"
const DB_VERSION = 1
const STORE_NAME = "sync_tokens"

class LocalSyncStorage {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  private async initDB(): Promise<void> {
    if (this.db) return

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error("[LOCAL-SYNC] Failed to open IndexedDB")
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "token" })
          store.createIndex("expires_at", "expires_at", { unique: false })
          store.createIndex("device_id", "device_id", { unique: false })
        }
      }
    })

    return this.initPromise
  }

  async createToken(data: {
    token: string
    device_id: string
    device_name: string
    data: any
    version: string
    expires_at: string
  }): Promise<SyncToken> {
    await this.initDB()

    const syncToken: SyncToken = {
      id: crypto.randomUUID(),
      token: data.token,
      device_id: data.device_id,
      device_name: data.device_name,
      data: data.data,
      created_at: new Date().toISOString(),
      expires_at: data.expires_at,
      version: data.version,
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(syncToken)

      request.onsuccess = () => {
        console.log("[LOCAL-SYNC] Token created:", data.token)
        resolve(syncToken)
      }

      request.onerror = () => {
        console.error("[LOCAL-SYNC] Failed to create token:", request.error)
        reject(request.error)
      }
    })
  }

  async getToken(token: string): Promise<SyncToken | null> {
    await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(token)

      request.onsuccess = () => {
        const result = request.result as SyncToken | undefined

        if (!result) {
          resolve(null)
          return
        }

        // Check if token is expired
        const expiresAt = new Date(result.expires_at)
        if (expiresAt < new Date()) {
          console.log("[LOCAL-SYNC] Token expired:", token)
          // Auto-delete expired token
          this.deleteToken(token)
          resolve(null)
          return
        }

        resolve(result)
      }

      request.onerror = () => {
        console.error("[LOCAL-SYNC] Failed to get token:", request.error)
        reject(request.error)
      }
    })
  }

  async deleteToken(token: string): Promise<void> {
    await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(token)

      request.onsuccess = () => {
        console.log("[LOCAL-SYNC] Token deleted:", token)
        resolve()
      }

      request.onerror = () => {
        console.error("[LOCAL-SYNC] Failed to delete token:", request.error)
        reject(request.error)
      }
    })
  }

  async cleanupExpiredTokens(): Promise<number> {
    await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index("expires_at")
      const request = index.openCursor()
      const now = new Date().toISOString()
      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const token = cursor.value as SyncToken
          if (token.expires_at < now) {
            cursor.delete()
            deletedCount++
          }
          cursor.continue()
        } else {
          console.log(`[LOCAL-SYNC] Cleaned up ${deletedCount} expired tokens`)
          resolve(deletedCount)
        }
      }

      request.onerror = () => {
        console.error("[LOCAL-SYNC] Failed to cleanup tokens:", request.error)
        reject(request.error)
      }
    })
  }

  // Fallback to localStorage for environments without IndexedDB
  private fallbackCreateToken(data: {
    token: string
    device_id: string
    device_name: string
    data: any
    version: string
    expires_at: string
  }): SyncToken {
    const syncToken: SyncToken = {
      id: crypto.randomUUID(),
      token: data.token,
      device_id: data.device_id,
      device_name: data.device_name,
      data: data.data,
      created_at: new Date().toISOString(),
      expires_at: data.expires_at,
      version: data.version,
    }

    try {
      const key = `sync_token_${data.token}`
      localStorage.setItem(key, JSON.stringify(syncToken))
      console.log("[LOCAL-SYNC] Token created (localStorage fallback):", data.token)
      return syncToken
    } catch (error) {
      console.error("[LOCAL-SYNC] localStorage fallback failed:", error)
      throw error
    }
  }

  private fallbackGetToken(token: string): SyncToken | null {
    try {
      const key = `sync_token_${token}`
      const item = localStorage.getItem(key)

      if (!item) {
        return null
      }

      const syncToken = JSON.parse(item) as SyncToken

      // Check if token is expired
      const expiresAt = new Date(syncToken.expires_at)
      if (expiresAt < new Date()) {
        localStorage.removeItem(key)
        return null
      }

      return syncToken
    } catch (error) {
      console.error("[LOCAL-SYNC] localStorage fallback get failed:", error)
      return null
    }
  }

  private fallbackDeleteToken(token: string): void {
    try {
      const key = `sync_token_${token}`
      localStorage.removeItem(key)
      console.log("[LOCAL-SYNC] Token deleted (localStorage fallback):", token)
    } catch (error) {
      console.error("[LOCAL-SYNC] localStorage fallback delete failed:", error)
    }
  }

  // Public API with fallback
  async create(data: {
    token: string
    device_id: string
    device_name: string
    data: any
    version: string
    expires_at: string
  }): Promise<SyncToken> {
    try {
      if (typeof indexedDB !== "undefined") {
        return await this.createToken(data)
      } else {
        return this.fallbackCreateToken(data)
      }
    } catch (error) {
      console.warn("[LOCAL-SYNC] IndexedDB failed, using localStorage fallback:", error)
      return this.fallbackCreateToken(data)
    }
  }

  async get(token: string): Promise<SyncToken | null> {
    try {
      if (typeof indexedDB !== "undefined") {
        return await this.getToken(token)
      } else {
        return this.fallbackGetToken(token)
      }
    } catch (error) {
      console.warn("[LOCAL-SYNC] IndexedDB failed, using localStorage fallback:", error)
      return this.fallbackGetToken(token)
    }
  }

  async delete(token: string): Promise<void> {
    try {
      if (typeof indexedDB !== "undefined") {
        return await this.deleteToken(token)
      } else {
        this.fallbackDeleteToken(token)
      }
    } catch (error) {
      console.warn("[LOCAL-SYNC] IndexedDB failed, using localStorage fallback:", error)
      this.fallbackDeleteToken(token)
    }
  }
}

export const localSyncStorage = new LocalSyncStorage()

// Auto-cleanup expired tokens every 5 minutes
if (typeof window !== "undefined") {
  setInterval(() => {
    localSyncStorage.cleanupExpiredTokens().catch(console.error)
  }, 5 * 60 * 1000)
}
