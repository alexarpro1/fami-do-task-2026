import { createClient } from "@/lib/supabase/client"

const DEVICE_ID_KEYS = ["famiapp-device-id", "famiapp_device_id"] as const
const SYNC_ID_PATTERN = /^[A-Z0-9]{6}$/

type SupabaseClient = ReturnType<typeof createClient>

export type SyncSecurityErrorCode =
  | "authentication_required"
  | "invite_required"
  | "invalid_invite"
  | "master_required"
  | "membership_required"
  | "device_already_bound"
  | "device_membership_mismatch"
  | "last_master_required"
  | "child_assignment_required"
  | "invalid_child_assignment"
  | "migration_required"
  | "network"
  | "unknown"

type SecurityResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; errorCode: SyncSecurityErrorCode }

function classifySecurityError(error: unknown): SyncSecurityErrorCode {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : ""
  const normalized = message.toLowerCase()
  const known: SyncSecurityErrorCode[] = [
    "authentication_required",
    "invite_required",
    "invalid_invite",
    "master_required",
    "membership_required",
    "device_already_bound",
    "device_membership_mismatch",
    "last_master_required",
    "child_assignment_required",
    "invalid_child_assignment",
  ]
  const match = known.find((code) => normalized.includes(code))
  if (match) return match
  if (/function .* does not exist|could not find the function|404/.test(normalized)) {
    return "migration_required"
  }
  if (/fetch|network|timeout|offline|unreachable|502|503/.test(normalized)) return "network"
  return "unknown"
}

function failed(error: unknown, fallback: string): SecurityResult<never> {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? fallback)
      : typeof error === "string"
        ? error
        : fallback
  return { ok: false, error: message, errorCode: classifySecurityError(error) }
}

function normalizeSyncId(syncId: string): string {
  const normalized = syncId.trim().toUpperCase()
  if (!SYNC_ID_PATTERN.test(normalized)) {
    throw new Error("Ungültige Sync-ID.")
  }
  return normalized
}

export function getLocalSyncDeviceId(): string {
  if (typeof window === "undefined") return ""
  for (const key of DEVICE_ID_KEYS) {
    const value = localStorage.getItem(key)
    if (value) return value
  }
  return ""
}

/**
 * Beansprucht nur eine nachweislich neue, leere Sync-ID.
 * Für bestehende Familien ist stattdessen ein 256-Bit-Einladungstoken nötig.
 */
export async function ensureSyncMembership(
  syncId: string,
  client: SupabaseClient = createClient(),
): Promise<SecurityResult<{ role: "master" | "parent" | "child"; childId: string | null }>> {
  let normalized: string
  try {
    normalized = normalizeSyncId(syncId)
  } catch (error) {
    return failed(error, "Ungültige Sync-ID.")
  }

  const { data, error } = await client.rpc("claim_sync_family", {
    p_sync_id: normalized,
    p_device_id: getLocalSyncDeviceId() || null,
  })
  if (error) return failed(error, "Sync-Mitgliedschaft konnte nicht bestätigt werden.")

  const result = data as {
    ok?: boolean
    role?: "master" | "parent" | "child"
    child_id?: string | null
  } | null
  return result?.ok && (result.role === "master" || result.role === "parent" || result.role === "child")
    ? {
        ok: true,
        role: result.role,
        childId: result.role === "child" && typeof result.child_id === "string"
          ? result.child_id
          : null,
      }
    : failed("membership_required", "Sync-Mitgliedschaft konnte nicht bestätigt werden.")
}

export async function createSyncInvite(
  syncId: string,
  role: "parent" | "child" = "parent",
  ttlMinutes = 15,
  childId: string | null = null,
  client: SupabaseClient = createClient(),
): Promise<SecurityResult<{
  token: string
  expiresAt: string
  role: "parent" | "child"
  childId: string | null
}>> {
  let normalized: string
  try {
    normalized = normalizeSyncId(syncId)
  } catch (error) {
    return failed(error, "Ungültige Sync-ID.")
  }

  const { data, error } = await client.rpc("create_sync_invite", {
    p_sync_id: normalized,
    p_role: role,
    p_ttl_minutes: ttlMinutes,
    p_child_id: role === "child" ? childId : null,
  })
  if (error) return failed(error, "Einladung konnte nicht erstellt werden.")

  const result = data as {
    token?: string
    expires_at?: string
    role?: "parent" | "child"
    child_id?: string | null
  } | null
  if (!result?.token || !result.expires_at) {
    return failed("unknown", "Einladung konnte nicht erstellt werden.")
  }
  return {
    ok: true,
    token: result.token,
    expiresAt: result.expires_at,
    role: result.role === "child" ? "child" : role,
    childId: result.role === "child" && typeof result.child_id === "string"
      ? result.child_id
      : null,
  }
}

export async function getSyncMembershipRole(
  syncId: string,
  client: SupabaseClient = createClient(),
): Promise<SecurityResult<{ role: "master" | "parent" | "child" }>> {
  let normalized: string
  try {
    normalized = normalizeSyncId(syncId)
  } catch (error) {
    return failed(error, "Ungültige Sync-ID.")
  }
  const { data, error } = await client.rpc("sync_member_role", { p_sync_id: normalized })
  if (error) return failed(error, "Rolle konnte nicht geladen werden.")
  if (data !== "master" && data !== "parent" && data !== "child") {
    return failed("membership_required", "Keine bestätigte Mitgliedschaft.")
  }
  return { ok: true, role: data }
}

export async function acceptSyncInvite(
  syncId: string,
  token: string,
  client: SupabaseClient = createClient(),
): Promise<SecurityResult<{ role: "parent" | "child"; childId: string | null }>> {
  let normalized: string
  try {
    normalized = normalizeSyncId(syncId)
  } catch (error) {
    return failed(error, "Ungültige Sync-ID.")
  }

  const normalizedToken = token.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(normalizedToken)) {
    return failed("invalid_invite", "Ungültige Einladung.")
  }
  const deviceId = getLocalSyncDeviceId()
  if (!deviceId) return failed("invalid_invite", "Geräte-ID fehlt.")

  const { data, error } = await client.rpc("accept_sync_invite", {
    p_sync_id: normalized,
    p_token: normalizedToken,
    p_device_id: deviceId,
  })
  if (error) return failed(error, "Einladung konnte nicht angenommen werden.")

  const result = data as {
    ok?: boolean
    role?: "parent" | "child"
    child_id?: string | null
  } | null
  return result?.ok && (result.role === "parent" || result.role === "child")
    ? {
        ok: true,
        role: result.role,
        childId: result.role === "child" && typeof result.child_id === "string"
          ? result.child_id
          : null,
      }
    : failed("invalid_invite", "Einladung konnte nicht angenommen werden.")
}

export interface RegisterSyncDeviceInput {
  syncId: string
  deviceId: string
  deviceName?: string | null
  osVersion?: string | null
  deviceModel?: string | null
  regionTimezone?: string | null
}

export async function registerSyncDevice(
  input: RegisterSyncDeviceInput,
  client: SupabaseClient = createClient(),
): Promise<SecurityResult<{ role: "master" | "parent" | "child" }>> {
  const { data, error } = await client.rpc("register_sync_device", {
    p_sync_id: normalizeSyncId(input.syncId),
    p_device_id: input.deviceId,
    p_device_name: input.deviceName ?? null,
    p_os_version: input.osVersion ?? null,
    p_device_model: input.deviceModel ?? null,
    p_region_timezone: input.regionTimezone ?? null,
  })
  if (error) return failed(error, "Geräteregistrierung abgelehnt.")
  const result = data as { ok?: boolean; role?: "master" | "parent" | "child" } | null
  return result?.ok && (result.role === "master" || result.role === "parent" || result.role === "child")
    ? { ok: true, role: result.role }
    : failed("membership_required", "Geräteregistrierung abgelehnt.")
}

export async function heartbeatSyncDevice(
  deviceId: string,
  client: SupabaseClient = createClient(),
): Promise<boolean> {
  const { data, error } = await client.rpc("heartbeat_sync_device", { p_device_id: deviceId })
  if (error) return false
  return data === true
}

export async function updateOwnSyncDevice(
  deviceId: string,
  options: { name?: string; disconnect?: boolean },
  client: SupabaseClient = createClient(),
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await client.rpc("update_own_sync_device", {
    p_device_id: deviceId,
    p_device_name: options.name ?? null,
    p_disconnect: options.disconnect ?? false,
  })
  if (error) return { ok: false, error: error.message }
  return data === true ? { ok: true } : { ok: false, error: "Geräteaktion abgelehnt." }
}

export async function manageSyncDevice(
  syncId: string,
  deviceId: string,
  changes: { name?: string; role?: "master" | "parent" | "child"; isActive?: boolean },
  client: SupabaseClient = createClient(),
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await client.rpc("manage_sync_device", {
    p_sync_id: normalizeSyncId(syncId),
    p_device_id: deviceId,
    p_device_name: changes.name ?? null,
    p_role: changes.role ?? null,
    p_is_active: changes.isActive ?? null,
  })
  if (error) return { ok: false, error: error.message }
  return data === true ? { ok: true } : { ok: false, error: "Geräteverwaltung abgelehnt." }
}
