import { createClient } from "./supabase/client"
import type { FamilyState, Child, Task, Reward, Rule, AppSettings } from "@/types"
import { normalizeStoredLanguage } from "@/lib/i18n"

// Generiert einen 8-stelligen Familien-Code
export function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generiert eine eindeutige Geraete-ID
export function getDeviceId(): string {
  if (typeof window === "undefined") return ""

  let deviceId = localStorage.getItem("famiapp_device_id")
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem("famiapp_device_id", deviceId)
  }
  return deviceId
}

function getSafeSupabaseClient() {
  try {
    return createClient()
  } catch (error) {
    console.error("[FdT] Failed to get Supabase client:", error)
    return null
  }
}

// Familie erstellen (Master-Admin)
export async function createFamily(familyName: string): Promise<{
  success: boolean
  familyCode?: string
  familyId?: string
  error?: string
}> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) {
    return { success: false, error: "Datenbankverbindung nicht verfuegbar" }
  }

  const deviceId = getDeviceId()
  const familyCode = generateFamilyCode()

  try {
    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({
        name: familyName,
        code: familyCode,
        master_device_id: deviceId,
      })
      .select()
      .single()

    if (familyError) throw familyError

    const { error: memberError } = await supabase.from("family_members").insert({
      family_id: family.id,
      device_id: deviceId,
      device_name: "Master Admin",
      role: "master",
    })

    if (memberError) throw memberError

    localStorage.setItem("famiapp_family_id", family.id)
    localStorage.setItem("famiapp_family_code", familyCode)
    localStorage.setItem("famiapp_role", "master")

    return { success: true, familyCode, familyId: family.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Familie beitreten (Kind/Elternteil)
export async function joinFamily(
  code: string,
  childId?: string,
): Promise<{
  success: boolean
  familyId?: string
  familyName?: string
  role?: string
  error?: string
}> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) {
    return { success: false, error: "Datenbankverbindung nicht verfuegbar" }
  }

  const deviceId = getDeviceId()

  try {
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("*")
      .eq("code", code.toUpperCase())
      .single()

    if (familyError || !family) {
      return { success: false, error: "Familie nicht gefunden. Bitte Code pruefen." }
    }

    const { data: existingMember } = await supabase
      .from("family_members")
      .select("*")
      .eq("family_id", family.id)
      .eq("device_id", deviceId)
      .single()

    if (existingMember) {
      localStorage.setItem("famiapp_family_id", family.id)
      localStorage.setItem("famiapp_family_code", family.code)
      localStorage.setItem("famiapp_role", existingMember.role)
      if (existingMember.child_id) {
        localStorage.setItem("famiapp_child_id", existingMember.child_id)
      }

      return {
        success: true,
        familyId: family.id,
        familyName: family.name,
        role: existingMember.role,
      }
    }

    const role = childId ? "child" : "parent"
    const { error: memberError } = await supabase.from("family_members").insert({
      family_id: family.id,
      device_id: deviceId,
      device_name: childId ? `Kind-Geraet` : "Eltern-Geraet",
      role: role,
      child_id: childId || null,
    })

    if (memberError) throw memberError

    localStorage.setItem("famiapp_family_id", family.id)
    localStorage.setItem("famiapp_family_code", family.code)
    localStorage.setItem("famiapp_role", role)
    if (childId) {
      localStorage.setItem("famiapp_child_id", childId)
    }

    return {
      success: true,
      familyId: family.id,
      familyName: family.name,
      role,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Familie verlassen
export async function leaveFamily(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSafeSupabaseClient()
  const deviceId = getDeviceId()
  const familyId = localStorage.getItem("famiapp_family_id")

  if (!familyId) {
    return { success: true }
  }

  try {
    if (supabase) {
      await supabase.from("family_members").delete().eq("family_id", familyId).eq("device_id", deviceId)
    }

    localStorage.removeItem("famiapp_family_id")
    localStorage.removeItem("famiapp_family_code")
    localStorage.removeItem("famiapp_role")
    localStorage.removeItem("famiapp_child_id")

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Daten zur Cloud synchronisieren (Push)
export async function pushData(state: FamilyState): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) {
    return { success: false, error: "Datenbankverbindung nicht verfuegbar" }
  }

  const familyId = localStorage.getItem("famiapp_family_id")
  const deviceId = getDeviceId()

  if (!familyId) {
    return { success: false, error: "Nicht mit Familie verbunden" }
  }

  try {
    const { error } = await supabase.from("family_data").upsert(
      {
        family_id: familyId,
        data_type: "full_state",
        data: state,
        updated_by: deviceId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "family_id,data_type",
      },
    )

    if (error) throw error

    await supabase.from("sync_log").insert({
      family_id: familyId,
      device_id: deviceId,
      action: "push",
      data_type: "full_state",
    })

    await supabase
      .from("family_members")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("family_id", familyId)
      .eq("device_id", deviceId)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sync Children
export async function syncChildren(children: Child[]): Promise<{ success: boolean; error?: string }> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) return { success: false, error: "Datenbankverbindung nicht verfuegbar" }

  const familyId = localStorage.getItem("famiapp_family_id")
  const deviceId = getDeviceId()

  if (!familyId) return { success: false, error: "Nicht mit Familie verbunden" }

  try {
    const childrenData = children.map((child) => ({
      id: child.id,
      family_id: familyId,
      name: child.name,
      age: child.age,
      avatar: child.avatar,
      color: child.color,
      points: child.points,
      total_points_earned: child.totalPointsEarned,
      level: child.level || 1,
      current_streak: child.currentStreak || 0,
      longest_streak: child.longestStreak || 0,
      last_active_date: child.lastActiveDate || null,
      wishlist_reward_ids: child.wishlistRewardIds || [],
      achievements: child.achievements || [],
      updated_at: new Date().toISOString(),
      updated_by: deviceId,
    }))

    const { error } = await supabase.from("synced_children").upsert(childrenData)
    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sync Tasks
export async function syncTasks(tasks: Task[]): Promise<{ success: boolean; error?: string }> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) return { success: false, error: "Datenbankverbindung nicht verfuegbar" }

  const familyId = localStorage.getItem("famiapp_family_id")
  const deviceId = getDeviceId()

  if (!familyId) return { success: false, error: "Nicht mit Familie verbunden" }

  try {
    const tasksData = tasks.map((task) => ({
      id: task.id,
      family_id: familyId,
      title: task.title,
      description: task.description || null,
      note: task.note || null,
      points: task.points,
      category: task.category,
      difficulty: task.difficulty,
      emoji: task.emoji,
      duration: task.duration || null,
      days: task.days || [],
      is_active: task.isActive,
      task_order: task.order,
      daily_limit: task.dailyLimit || null,
      usage_count: task.usageCount || 0,
      start_time: task.startTime || null,
      end_time: task.endTime || null,
      repeat_interval: task.repeatInterval || null,
      timer_options: task.timerOptions || null,
      updated_at: new Date().toISOString(),
      updated_by: deviceId,
    }))

    const { error } = await supabase.from("synced_tasks").upsert(tasksData)
    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sync Rewards
export async function syncRewards(rewards: Reward[]): Promise<{ success: boolean; error?: string }> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) return { success: false, error: "Datenbankverbindung nicht verfuegbar" }

  const familyId = localStorage.getItem("famiapp_family_id")
  const deviceId = getDeviceId()

  if (!familyId) return { success: false, error: "Nicht mit Familie verbunden" }

  try {
    const rewardsData = rewards.map((reward) => ({
      id: reward.id,
      family_id: familyId,
      name: reward.name,
      description: reward.description || null,
      cost: reward.cost,
      emoji: reward.emoji,
      category: reward.category,
      is_active: reward.isActive,
      stock: reward.stock || null,
      daily_limit: reward.dailyLimit || null,
      repeat_interval: reward.repeatInterval || null,
      purchase_count: reward.purchaseCount || 0,
      updated_at: new Date().toISOString(),
      updated_by: deviceId,
    }))

    const { error } = await supabase.from("synced_rewards").upsert(rewardsData)
    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sync Rules
export async function syncRules(rules: Rule[]): Promise<{ success: boolean; error?: string }> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) return { success: false, error: "Datenbankverbindung nicht verfuegbar" }

  const familyId = localStorage.getItem("famiapp_family_id")
  const deviceId = getDeviceId()

  if (!familyId) return { success: false, error: "Nicht mit Familie verbunden" }

  try {
    const rulesData = rules.map((rule) => ({
      id: rule.id,
      family_id: familyId,
      title: rule.title,
      description: rule.description || null,
      points: rule.points,
      is_positive: rule.isPositive,
      emoji: rule.emoji,
      category: rule.category,
      daily_limit: rule.dailyLimit || null,
      repeat_interval: rule.repeatInterval || null,
      is_active: rule.isActive,
      rule_order: rule.order || 0,
      usage_count: rule.usageCount || 0,
      updated_at: new Date().toISOString(),
      updated_by: deviceId,
    }))

    const { error } = await supabase.from("synced_rules").upsert(rulesData)
    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Sync Settings
export async function syncSettings(settings: AppSettings): Promise<{ success: boolean; error?: string }> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) return { success: false, error: "Datenbankverbindung nicht verfuegbar" }

  const familyId = localStorage.getItem("famiapp_family_id")
  const deviceId = getDeviceId()

  if (!familyId) return { success: false, error: "Nicht mit Familie verbunden" }

  try {
    const settingsData = {
      family_id: familyId,
      language: settings.language,
      theme: settings.theme,
      sound_enabled: settings.soundEnabled,
      animations_enabled: settings.animationsEnabled,
      admin_pin: settings.adminPin,
      admin_pin_enabled: settings.adminPinEnabled,
      timer_sound_enabled: settings.timerSoundEnabled,
      show_confetti: settings.showConfetti,
      pet_system_enabled: settings.petSystemEnabled,
      sticker_system_enabled: settings.stickerSystemEnabled,
      weather_enabled: settings.weatherEnabled,
      mood_tracking_enabled: settings.moodTrackingEnabled,
      school_time_enabled: settings.schoolTimeEnabled,
      admin_tab_order: settings.adminTabOrder,
      notifications_enabled: settings.notificationsEnabled,
      notify_before_minutes: settings.notifyBeforeMinutes,
      favorite_rule_ids: settings.favoriteRuleIds,
      shop_enabled: settings.shopEnabled,
      profile_enabled: settings.profileEnabled,
      parent_notifications_enabled: settings.parentNotificationsEnabled || false,
      daily_summary_enabled: settings.dailySummaryEnabled || false,
      daily_summary_time: settings.dailySummaryTime || "20:00",
      updated_at: new Date().toISOString(),
      updated_by: deviceId,
    }

    const { error } = await supabase.from("synced_settings").upsert(settingsData)
    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function pushDataGranular(state: FamilyState): Promise<{
  success: boolean
  error?: string
}> {
  const results = await Promise.all([
    syncChildren(state.children),
    syncTasks(state.tasks),
    syncRewards(state.rewards),
    syncRules(state.rules),
    syncSettings(state.settings),
  ])

  const failed = results.find((r) => !r.success)
  if (failed) {
    return { success: false, error: failed.error }
  }

  // Also keep the full state backup
  await pushData(state)

  return { success: true }
}

// Daten von Cloud laden (Pull)
export async function pullData(): Promise<{
  success: boolean
  data?: FamilyState
  error?: string
}> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) {
    return { success: false, error: "Datenbankverbindung nicht verfuegbar" }
  }

  const familyId = localStorage.getItem("famiapp_family_id")
  const deviceId = getDeviceId()

  if (!familyId) {
    return { success: false, error: "Nicht mit Familie verbunden" }
  }

  try {
    const { data, error } = await supabase
      .from("family_data")
      .select("data, updated_at")
      .eq("family_id", familyId)
      .eq("data_type", "full_state")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: undefined }
      }
      throw error
    }

    await supabase.from("sync_log").insert({
      family_id: familyId,
      device_id: deviceId,
      action: "pull",
      data_type: "full_state",
    })

    return { success: true, data: data.data as FamilyState }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function pullDataGranular(): Promise<{
  success: boolean
  data?: Partial<FamilyState>
  error?: string
}> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) return { success: false, error: "Datenbankverbindung nicht verfuegbar" }

  const familyId = localStorage.getItem("famiapp_family_id")
  if (!familyId) return { success: false, error: "Nicht mit Familie verbunden" }

  try {
    const [childrenRes, tasksRes, rewardsRes, rulesRes, settingsRes] = await Promise.all([
      supabase.from("synced_children").select("*").eq("family_id", familyId),
      supabase.from("synced_tasks").select("*").eq("family_id", familyId),
      supabase.from("synced_rewards").select("*").eq("family_id", familyId),
      supabase.from("synced_rules").select("*").eq("family_id", familyId),
      supabase.from("synced_settings").select("*").eq("family_id", familyId).single(),
    ])

    const data: Partial<FamilyState> = {}

    if (childrenRes.data) {
      data.children = childrenRes.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        age: c.age,
        avatar: c.avatar,
        color: c.color,
        points: c.points,
        totalPointsEarned: c.total_points_earned,
        level: c.level,
        currentStreak: c.current_streak,
        longestStreak: c.longest_streak,
        lastActiveDate: c.last_active_date,
        wishlistRewardIds: c.wishlist_reward_ids,
        achievements: c.achievements,
        createdAt: c.created_at,
      }))
    }

    if (tasksRes.data) {
      data.tasks = tasksRes.data.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        note: t.note,
        points: t.points,
        category: t.category,
        difficulty: t.difficulty,
        emoji: t.emoji,
        duration: t.duration,
        days: t.days,
        isActive: t.is_active,
        order: t.task_order,
        dailyLimit: t.daily_limit,
        usageCount: t.usage_count,
        startTime: t.start_time,
        endTime: t.end_time,
        repeatInterval: t.repeat_interval,
        timerOptions: t.timer_options,
      }))
    }

    if (rewardsRes.data) {
      data.rewards = rewardsRes.data.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        cost: r.cost,
        emoji: r.emoji,
        category: r.category,
        isActive: r.is_active,
        stock: r.stock,
        dailyLimit: r.daily_limit,
        repeatInterval: r.repeat_interval,
        purchaseCount: r.purchase_count,
      }))
    }

    if (rulesRes.data) {
      data.rules = rulesRes.data.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        points: r.points,
        isPositive: r.is_positive,
        emoji: r.emoji,
        category: r.category,
        dailyLimit: r.daily_limit,
        repeatInterval: r.repeat_interval,
        isActive: r.is_active,
        order: r.rule_order,
        usageCount: r.usage_count,
      }))
    }

    if (settingsRes.data) {
      const s = settingsRes.data
      data.settings = {
        language: normalizeStoredLanguage(s.language),
        theme: s.theme,
        soundEnabled: s.sound_enabled,
        animationsEnabled: s.animations_enabled,
        adminPin: s.admin_pin,
        adminPinEnabled: s.admin_pin_enabled,
        timerSoundEnabled: s.timer_sound_enabled,
        showConfetti: s.show_confetti,
        petSystemEnabled: s.pet_system_enabled,
        stickerSystemEnabled: s.sticker_system_enabled,
        weatherEnabled: s.weather_enabled,
        moodTrackingEnabled: s.mood_tracking_enabled,
        schoolTimeEnabled: s.school_time_enabled,
        adminTabOrder: s.admin_tab_order,
        notificationsEnabled: s.notifications_enabled,
        notifyBeforeMinutes: s.notify_before_minutes,
        favoriteRuleIds: s.favorite_rule_ids,
        shopEnabled: s.shop_enabled,
        profileEnabled: s.profile_enabled,
        parentNotificationsEnabled: s.parent_notifications_enabled,
        dailySummaryEnabled: s.daily_summary_enabled,
        dailySummaryTime: s.daily_summary_time,
      }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Familien-Mitglieder abrufen
export async function getFamilyMembers(): Promise<{
  success: boolean
  members?: any[]
  error?: string
}> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) {
    return { success: false, error: "Datenbankverbindung nicht verfuegbar" }
  }

  const familyId = localStorage.getItem("famiapp_family_id")

  if (!familyId) {
    return { success: false, error: "Nicht mit Familie verbunden" }
  }

  try {
    const { data, error } = await supabase
      .from("family_members")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (error) throw error

    return { success: true, members: data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Mitglied entfernen (nur Master)
export async function removeFamilyMember(memberId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = getSafeSupabaseClient()
  if (!supabase) {
    return { success: false, error: "Datenbankverbindung nicht verfuegbar" }
  }

  const role = localStorage.getItem("famiapp_role")

  if (role !== "master") {
    return { success: false, error: "Nur der Master-Admin kann Mitglieder entfernen" }
  }

  try {
    const { error } = await supabase.from("family_members").update({ is_active: false }).eq("id", memberId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getFamilyInfo(): Promise<{
  connected: boolean
  familyId?: string
  familyCode?: string
  familyName?: string
  role?: string
  childId?: string
}> {
  if (typeof window === "undefined") {
    return { connected: false }
  }

  const familyId = localStorage.getItem("famiapp_family_id")
  const familyCode = localStorage.getItem("famiapp_family_code")
  const role = localStorage.getItem("famiapp_role")
  const childId = localStorage.getItem("famiapp_child_id")

  if (!familyId) {
    return { connected: false }
  }

  // Try to get family name, but don't fail if Supabase is not available
  let familyName: string | undefined
  try {
    const supabase = getSafeSupabaseClient()
    if (supabase) {
      const { data } = await supabase.from("families").select("name").eq("id", familyId).single()
      familyName = data?.name
    }
  } catch (error) {
    // Silently fail - use cached data
    console.error("[FdT] Failed to fetch family name:", error)
  }

  return {
    connected: true,
    familyId,
    familyCode: familyCode || undefined,
    familyName,
    role: role || undefined,
    childId: childId || undefined,
  }
}

// Echtzeit-Subscription fuer Sync
export function subscribeToFamilyChanges(onDataChanged: (newData: FamilyState) => void): (() => void) | null {
  // DISABLED: Supabase Realtime causes persistent CHANNEL_ERROR in this environment
  console.log("[FdT] subscribeToFamilyChanges is disabled - use manual sync instead")
  return null
}

export function enableAutoSync(state: FamilyState, onSyncComplete?: (success: boolean) => void): () => void {
  let syncTimeout: NodeJS.Timeout

  const debouncedSync = () => {
    clearTimeout(syncTimeout)
    syncTimeout = setTimeout(async () => {
      const result = await pushDataGranular(state)
      if (onSyncComplete) {
        onSyncComplete(result.success)
      }
    }, 2000) // 2 Sekunden Debounce
  }

  // Initial sync
  debouncedSync()

  // Return cleanup function
  return () => clearTimeout(syncTimeout)
}

export async function resolveConflicts(localState: FamilyState, remoteState: FamilyState): Promise<FamilyState> {
  const localTime = new Date(localState.lastUpdated || 0).getTime()
  const remoteTime = new Date(remoteState.lastUpdated || 0).getTime()

  // Neuere Version gewinnt
  if (remoteTime > localTime) {
    return remoteState
  }

  // Bei gleicher Zeit: Merge-Strategie
  if (remoteTime === localTime) {
    return {
      ...localState,
      // Remote children wenn mehr
      children: remoteState.children.length > localState.children.length ? remoteState.children : localState.children,
      // Remote tasks wenn mehr
      tasks: remoteState.tasks.length > localState.tasks.length ? remoteState.tasks : localState.tasks,
      // Remote rewards wenn mehr
      rewards: remoteState.rewards.length > localState.rewards.length ? remoteState.rewards : localState.rewards,
      // Lokale Punkte behalten (wichtiger)
      // Settings: Remote bevorzugen
      settings: remoteState.settings,
      lastUpdated: new Date().toISOString(),
    }
  }

  // Lokal ist neuer
  return localState
}

export async function smartSync(localState: FamilyState): Promise<{
  success: boolean
  resolvedState?: FamilyState
  error?: string
}> {
  // 1. Remote State laden
  const pullResult = await pullData()
  if (!pullResult.success) {
    return { success: false, error: pullResult.error }
  }

  // 2. Konflikte auflösen wenn remote Daten existieren
  let finalState = localState
  if (pullResult.data) {
    finalState = await resolveConflicts(localState, pullResult.data)
  }

  // 3. Finalen State pushen
  const pushResult = await pushDataGranular(finalState)
  if (!pushResult.success) {
    return { success: false, error: pushResult.error }
  }

  return { success: true, resolvedState: finalState }
}
