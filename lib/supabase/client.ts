import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()
// Unterstützt auch den alternativen Variablennamen aus dem Supabase-Dashboard
const SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  ""
).trim()

/** Mock-/Offline-Fehlercodes (kein echtes Supabase-API-Format). */
export const SUPABASE_ERR_NOT_CONFIGURED = "SUPABASE_NOT_CONFIGURED"
export const SUPABASE_ERR_UNREACHABLE = "SUPABASE_UNREACHABLE"

type MockErrorPayload = {
  data: null
  error: { message: string; code: string }
}

function mockError(code: string, message: string): MockErrorPayload {
  return { data: null, error: { message, code } }
}

let cloudUnreachable = false
let cloudUnreachableLogged = false

function isAuthRequest(input: RequestInfo | URL): boolean {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
  return raw.includes("/auth/v1/")
}

function logCloudUnreachable(reason: string) {
  if (cloudUnreachableLogged) return
  cloudUnreachableLogged = true
  cloudUnreachable = true
  console.warn(
    `[SUPABASE] Cloud nicht erreichbar (${reason}). App läuft offline weiter. ` +
      "NEXT_PUBLIC_SUPABASE_URL prüfen oder Variablen entfernen.",
  )
}

/** Nach Netzwerkfehler: keine weiteren Cloud-Versuche in dieser Session. */
async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    logCloudUnreachable(message)

    const status = isAuthRequest(input) ? 400 : 503
    return new Response(
      JSON.stringify({
        message,
        code: "NETWORK_ERROR",
        error: "network_error",
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

function createMockClient(kind: "not_configured" | "unreachable"): ReturnType<typeof createBrowserClient> {
  const payload =
    kind === "unreachable"
      ? mockError(SUPABASE_ERR_UNREACHABLE, "Supabase cloud unreachable")
      : mockError(SUPABASE_ERR_NOT_CONFIGURED, "Supabase not configured")

  const chain: Record<string, unknown> = {}
  const terminal = () => Promise.resolve(payload)
  chain.select = () => chain
  chain.eq = () => chain
  chain.order = () => chain
  chain.limit = () => chain
  chain.update = () => chain
  chain.delete = () => chain
  chain.maybeSingle = terminal
  chain.single = terminal
  chain.then = (resolve: (v: MockErrorPayload) => void) => Promise.resolve(payload).then(resolve)

  const noopChannel = {
    on: () => noopChannel,
    subscribe: (cb?: (status: string) => void) => {
      queueMicrotask(() => cb?.("CHANNEL_ERROR"))
      return noopChannel
    },
    track: () => Promise.resolve("ok"),
    send: () => Promise.resolve("ok"),
  }

  const storageOps = {
    upload: () => Promise.resolve(payload),
    remove: () => Promise.resolve(payload),
    getPublicUrl: () => ({ data: { publicUrl: "" } }),
  }

  return {
    from: () => ({
      ...chain,
      insert: () => {
        const insertChain: Record<string, unknown> = {
          select: () => Promise.resolve(payload),
          then: (resolve: (v: MockErrorPayload) => void) => Promise.resolve(payload).then(resolve),
        }
        return insertChain
      },
      upsert: terminal,
    }),
    storage: {
      from: () => storageOps,
    },
    rpc: terminal,
    channel: () => noopChannel,
    removeChannel: () => {},
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInAnonymously: () =>
        Promise.resolve({ data: { user: null, session: null }, error: { message: "offline" } }),
      updateUser: () => Promise.resolve({ data: { user: null }, error: { message: "offline" } }),
      refreshSession: () => Promise.resolve({ data: { session: null }, error: { message: "offline" } }),
    },
  } as ReturnType<typeof createBrowserClient>
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return createMockClient("not_configured")
  }
  if (cloudUnreachable) {
    return createMockClient("unreachable")
  }

  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: resilientFetch },
    })
  }
  return browserClient
}

/** Env-Variablen gesetzt (unabhängig von Erreichbarkeit). */
export function isSupabaseConfigured(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    ""
  ).trim()
  return (
    url.length > 0 &&
    key.length > 0 &&
    (url.startsWith("http://") || url.startsWith("https://"))
  )
}

/**
 * Wie CloudSyncPanel: Client-Env, sonst (Browser/Web) /api/supabase-config.
 * Capacitor/Native: nur Env (kein API-Route-Fallback).
 */
export async function probeSupabaseConfigured(): Promise<boolean> {
  if (isSupabaseConfigured()) return true
  if (typeof window === "undefined") return false
  try {
    const { isNativeApp } = await import("@/lib/device")
    if (isNativeApp()) return false
  } catch {
    /* ignore */
  }
  try {
    const response = await fetch("/api/supabase-config")
    if (!response.ok) return false
    const data = (await response.json()) as { configured?: boolean }
    return Boolean(data?.configured)
  } catch {
    return false
  }
}

/** Cloud-Sync sinnvoll nutzbar (konfiguriert und erreichbar). */
export function isSupabaseCloudActive(): boolean {
  return isSupabaseConfigured() && !cloudUnreachable
}

export function markSupabaseUnreachable(reason: string): void {
  logCloudUnreachable(reason)
}

type LooseError = {
  message?: string
  code?: string
  details?: string
  hint?: string
  status?: number
  statusCode?: number
}

function errorText(err: unknown): string {
  if (!err || typeof err !== "object") return typeof err === "string" ? err : ""
  const e = err as LooseError
  return [e.message, e.details, e.hint, e.code].filter(Boolean).join(" ")
}

/** Mock-Client: Env fehlt (URL/Key). */
export function isSupabaseNotConfiguredError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return typeof err === "string" && /supabase not configured/i.test(err)
  }
  const e = err as LooseError
  if (e.code === SUPABASE_ERR_NOT_CONFIGURED) return true
  return /supabase not configured/i.test(e.message ?? "")
}

/** Mock-Client oder Session-Flag: Cloud temporär offline. */
export function isSupabaseUnreachableError(err: unknown): boolean {
  if (cloudUnreachable) return true
  if (!err || typeof err !== "object") return false
  const e = err as LooseError
  if (e.code === SUPABASE_ERR_UNREACHABLE || e.code === "NETWORK_ERROR") return true
  return /cloud unreachable|network_error|failed to fetch/i.test(e.message ?? "")
}

/**
 * PostgREST / Postgres: Tabelle `videos` fehlt (Migration 010 nicht angewendet).
 * PGRST205 = schema cache; 42P01 = undefined_table.
 */
export function isVideosTableMissingError(err: unknown): boolean {
  const text = errorText(err).toLowerCase()
  if (!text) return false
  const e = err && typeof err === "object" ? (err as LooseError) : null
  if (e?.code === "PGRST205" || e?.code === "42P01") {
    return text.includes("videos")
  }
  return (
    (text.includes("videos") &&
      (text.includes("schema cache") ||
        text.includes("does not exist") ||
        text.includes("could not find the table") ||
        text.includes("relation") ||
        text.includes("undefined_table"))) ||
    text.includes("public.videos")
  )
}

/** Storage-Bucket `famiapp-videos` fehlt oder nicht erreichbar. */
export function isVideosBucketMissingError(err: unknown): boolean {
  const text = errorText(err).toLowerCase()
  if (!text) return false
  return (
    text.includes("famiapp-videos") ||
    text.includes("bucket not found") ||
    text.includes("no such bucket") ||
    (text.includes("bucket") && (text.includes("not found") || text.includes("does not exist")))
  )
}
