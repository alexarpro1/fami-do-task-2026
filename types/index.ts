// ============================================
// FAMIAPP - CORE TYPE DEFINITIONS
// ============================================

/** Schulklasse 1–5 für Lernspiele (Mathe, Wörter, Memory). */
export type SchoolGrade = 1 | 2 | 3 | 4 | 5

// Child Profile
export interface Child {
  id: string
  name: string
  age: number
  avatar: string
  color: string
  points: number
  totalPointsEarned: number
  createdAt: string
  /** Klassenstufe für Lernspiel-Curriculum; Default 1 wenn fehlend. */
  schoolGrade?: SchoolGrade
  level?: number // Current level based on totalPointsEarned
  wishlistRewardIds?: string[] // Reward IDs on wishlist (max 3)
  currentStreak?: number // Days in a row with completed tasks
  longestStreak?: number // Best streak ever
  lastActiveDate?: string // Last date with completed task (YYYY-MM-DD)
  achievements?: string[] // Achievement IDs unlocked
  /** Goldmünzen aus Minispielen (separat vom Punktesystem). */
  gameGoldCoins?: number
  /**
   * Zuletzt geteilter Standort (Kind-Gerät → Eltern über Family-State / Sync).
   * Keine Live-Tracking-Garantie; nur manuell oder bei Aktion erfasst.
   */
  lastSharedLocation?: {
    lat: number
    lon: number
    /** Genauigkeit in Metern, falls vom System geliefert */
    accuracyM?: number
    /** Zeitpunkt der Sendung auf dem Kind-Gerät. */
    sentAt?: string
    /** Quelle der Sendung (Intervall/Live/manuell). */
    source?: "interval" | "live" | "manual"
    /** Eindeutige Sendung vom Kind, wartet auf Empfangsbestätigung (ACK). */
    sendId?: string
    /** Empfangsbestätigung von Eltern-/Master-Gerät für genau diese Sendung. */
    ackedAt?: string
    ackedByRole?: "parent" | "master"
    ackedByDeviceId?: string
    recordedAt: string
  }
  /** Historie automatisch bestätigter Standort-Sendungen (ACK) durch Eltern/Master. */
  locationAckHistory?: Array<{
    sendId: string
    ackedAt: string
    ackedByRole: "parent" | "master"
    ackedByDeviceId?: string
    auto: true
  }>
  /** Automatische Positionshistorie (rolling) der letzten 30 Tage. */
  locationHistory?: Array<{
    sendId?: string
    lat: number
    lon: number
    accuracyM?: number
    recordedAt: string
    sentAt?: string
    source?: "interval" | "live" | "manual"
    ackedAt?: string
    ackedByRole?: "parent" | "master"
    ackedByDeviceId?: string
  }>
}

// Task Categories
export type TaskCategory = "morning" | "evening" | "weekend" | "custom"
export type TaskDifficulty = "easy" | "medium" | "hard"

// Task Definition
export interface Task {
  id: string
  title: string
  description?: string
  note?: string // Added note field for task instructions
  points: number
  category: TaskCategory
  difficulty: TaskDifficulty
  emoji: string
  duration?: number // in minutes
  days: string[] // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  isActive: boolean
  order: number
  dailyLimit?: number // max completions per day (0 = unlimited)
  usageCount?: number // total times completed
  startTime?: string // "06:30" format - task available from this time
  endTime?: string // "09:00" format - task available until this time
  /**
   * Vor Start des Zeitfensters in der Liste zeigen (als „Geplant“).
   * false = erst sichtbar, wenn das Zeitfenster beginnt.
   * Default / undefined = true (Abwärtskompatibilität).
   */
  showBeforeTimeWindow?: boolean
  repeatInterval?: number // Minutes between repetitions (e.g., 120 = 2 hours)
  timerOptions?: {
    showMiniTimer: boolean
    showVisualTimer: boolean
    showFocusTimer: boolean
  }
}

// Task Completion Record
export interface TaskCompletion {
  id: string
  taskId: string
  childId: string
  completedAt: string
  pointsEarned: number
  withTimer: boolean
}

// Reward Definition
export interface Reward {
  id: string
  name: string
  description?: string
  cost: number
  emoji: string
  category: "experience" | "privilege" | "item" | "special"
  isActive: boolean
  order?: number // Sortierreihenfolge in der Admin-Liste
  stock?: number // undefined = unlimited
  dailyLimit?: number // max purchases per day
  repeatInterval?: number // Minutes between purchases (e.g., 60 = 1 hour)
  purchaseCount?: number // total times purchased
}

// Reward Redemption Record
export interface RewardRedemption {
  id: string
  rewardId: string
  childId: string
  redeemedAt: string
  pointsSpent: number
}

// Behavior Rule
export interface Rule {
  id: string
  title: string
  description?: string
  points: number
  isPositive: boolean
  emoji: string
  category: "behavior" | "homework" | "chores" | "social" | "custom"
  dailyLimit?: number
  repeatInterval?: number // Minutes between repetitions (e.g., 120 = 2 hours)
  isActive: boolean
  order?: number
  usageCount?: number // total times applied
  /** Phase 18: Wenn true, Anwendung erzeugt status "pending", Punkte erst nach Freigabe. */
  requiresApproval?: boolean
}

// Rule Application Record
export interface RuleApplication {
  id: string
  ruleId: string
  childId: string
  appliedAt: string
  pointsChanged: number
  note?: string
  /** Phase 18: pending = wartet auf Freigabe, approved = Punkte gutgeschrieben, rejected = abgelehnt. */
  status?: "pending" | "approved" | "rejected"
}

// Virtual Pet
export interface Pet {
  id: string
  childId: string
  name: string
  type: "cat" | "dog" | "bunny" | "dragon" | "unicorn"
  level: number
  xp: number
  xpToNextLevel: number
  mood: "happy" | "neutral" | "sad"
  health: number // 0-100
  lastFed: string
  evolutionStage: 1 | 2 | 3 | 4 | 5
}

// Sticker for Album
export interface Sticker {
  id: string
  name: string
  emoji: string
  category: string
  rarity: "common" | "rare" | "epic" | "legendary"
  unlockedAt?: string
}

// Child's Sticker Collection
export interface StickerCollection {
  childId: string
  stickers: string[] // sticker ids
}

// Point adjustment / history record (manual or from games)
export interface PointAdjustment {
  id: string
  childId: string
  amount: number // positive or negative
  reason: string
  adjustedAt: string
  adjustedBy: "admin" | "game"
}

// Theme Configuration
export interface Theme {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
  background: string
  emoji: string
  isDark?: boolean
  description?: string
}

// Admin Tab Type
export type AdminTab =
  | "children"
  | "kontrollzentrale"
  | "tasks"
  | "rules"
  | "rewards"
  | "videos"
  | "stats"
  | "settings"

// App Settings
export interface AppSettings {
  language: "de" | "gb" | "es" | "tr" | "ru" | "ro"
  theme: string
  soundEnabled: boolean
  animationsEnabled: boolean
  adminPin: string
  adminPinEnabled: boolean
  timerSoundEnabled: boolean
  showConfetti: boolean
  petSystemEnabled: boolean
  stickerSystemEnabled: boolean
  weatherEnabled: boolean
  moodTrackingEnabled: boolean
  schoolTimeEnabled: boolean
  adminTabOrder: AdminTab[]
  notificationsEnabled: boolean
  notifyBeforeMinutes: number // Minutes before task window starts (0 = at start time)
  favoriteRuleIds: string[] // Max 8 favorite rules to show on home page
  shopEnabled: boolean
  profileEnabled: boolean
  /** Wetter: manueller Standort (wenn gesetzt, wird GPS ignoriert) */
  weatherLat?: number
  weatherLon?: number
  weatherCityName?: string
  parentNotificationsEnabled?: boolean // Notify parents when tasks are completed
  dailySummaryEnabled?: boolean // Send daily summary in the evening
  dailySummaryTime?: string // Time for daily summary (e.g., "20:00")
  /** Display order of child IDs (Kinder). When set, children are shown in this order. */
  childOrder?: string[]
  /** Show Spiele (Minigames) in navigation and on home. */
  gamesEnabled?: boolean
  /** Videos-Galerie in Navigation freischalten (Cloud-Videos + Offline-MP4). */
  videosEnabled?: boolean
  /** Audio-Raum in Navigation und als Funktion freischalten. */
  audioCommunicationEnabled?: boolean
  /** Vor Beitritt in Audio-Raum Admin-PIN verlangen. */
  audioJoinPinRequired?: boolean
  /** Kind-Geräte sprechen nur per Push-to-talk. */
  audioPushToTalkForChild?: boolean
  /** Desktop-Sidebar anzeigen (Navigation links auf großen Geräten). */
  sidebarEnabled?: boolean
  /**
   * Schwache Geräte: weniger Blur/Verlauf, reduzierte Motion, kein Pull-to-Refresh.
   * Wird zusätzlich bei wenig CPU/RAM automatisch empfohlen (siehe lib/fdt-low-spec.ts).
   */
  lowSpecPerformanceMode?: boolean
  /** Display order of game IDs on Spiele page (reaction, memory, tap, color, chess, dame). */
  gamesOrder?: string[]
  /** Display order of feature toggle keys in Einstellungen → Funktionen. */
  featureOrder?: string[]
  /** Phase 18: Globaler Schalter "Regel-Freigaben aktivieren" (Freigabe durch Eltern). */
  requireRuleApprovalGlobal?: boolean
  /**
   * Kind-Gerät: Standort automatisch in den Family-State schreiben (Sync zu Eltern).
   * Läuft nur bei Geräterolle „Kind“ und solange die App aktiv ist (kein garantiertes Hintergrund-GPS).
   */
  childLocationAutoShareEnabled?: boolean
  /** Intervall in Minuten (5–180), Standard 30 */
  childLocationAutoShareIntervalMinutes?: number
  /** Live-Standort aktivieren (schnelles Intervall bei aktiver App). */
  childLocationLiveEnabled?: boolean
  /** Live-Intervall in Sekunden (5-120), Standard 15. */
  childLocationLiveIntervalSeconds?: number
  /** Manueller "Jetzt senden"-Button im Kind-Bereich erlauben. */
  childLocationLiveManualSendEnabled?: boolean
  /**
   * Interner Sicherheitsstatus für Standort-Auto-Share (Kind-Gerät).
   * Wird gesetzt, wenn Senden wiederholt fehlschlägt und erinnert an GPS-Reaktivierung.
   */
  childLocationGpsFailureCount?: number
  childLocationGpsWarningCount?: number
  childLocationGpsWarningActive?: boolean
  childLocationGpsWarningSticky?: boolean
  childLocationGpsLastFailureAt?: string
  /** Zuletzt als "ohne ACK" gewertete Sendung, damit pro Sendung nur 1x gezählt wird. */
  childLocationLastUnackedSendId?: string
  /**
   * Nähe-Mehrspieler („Zu zweit“) global freigeben.
   * Default true: bestehende WLAN-Nähe bleibt nutzbar; Admin kann abschalten.
   */
  nearbyGamesEnabled?: boolean
  /**
   * Bluetooth-Transport für Nähe-Spiele freigeben (zusätzlich zu nearbyGamesEnabled).
   * Default false: Bluetooth nur nach expliziter Admin-Freigabe.
   */
  nearbyBluetoothEnabled?: boolean
  /** Optional pro Spiel (chess/dame); fehlender Key = erlaubt, wenn Master an. */
  nearbyGamesAllowed?: {
    chess?: boolean
    dame?: boolean
  }
}

// Complete Family State
export interface FamilyState {
  children: Child[]
  tasks: Task[]
  taskCompletions: TaskCompletion[]
  rewards: Reward[]
  rewardRedemptions: RewardRedemption[]
  rules: Rule[]
  ruleApplications: RuleApplication[]
  pointAdjustments: PointAdjustment[]
  pets: Pet[]
  stickerCollections: StickerCollection[]
  settings: AppSettings
  selectedChildId: string | null
  lastUpdated: string
  moodEntries: MoodEntry[]
  weather: WeatherData | null
  schoolTimes: SchoolTime[]
  achievements: Achievement[] // Achievement IDs unlocked
}

// Action Types for Reducer
export type FamilyAction =
  // Child Actions
  | { type: "ADD_CHILD"; payload: Omit<Child, "id" | "points" | "totalPointsEarned" | "createdAt"> }
  | { type: "UPDATE_CHILD"; payload: { id: string; updates: Partial<Child> } }
  | { type: "DELETE_CHILD"; payload: string }
  | { type: "SELECT_CHILD"; payload: string | null }
  | { type: "ADD_POINTS"; payload: { childId: string; points: number } }
  | { type: "SUBTRACT_POINTS"; payload: { childId: string; points: number } }
  | { type: "ADJUST_POINTS"; payload: { childId: string; amount: number; reason: string } }
  | { type: "ADD_POINTS_FROM_GAME"; payload: { childId: string; amount: number; reason: string } }
  | { type: "ADD_GOLD_COINS_FROM_GAME"; payload: { childId: string; amount: number } }
  | { type: "ADD_TO_WISHLIST"; payload: { childId: string; rewardId: string } }
  | { type: "REMOVE_FROM_WISHLIST"; payload: { childId: string; rewardId: string } }
  | { type: "UNLOCK_ACHIEVEMENT"; payload: { childId: string; achievementId: string } }
  // Task Actions
  | { type: "ADD_TASK"; payload: Omit<Task, "id" | "order"> }
  | { type: "UPDATE_TASK"; payload: { id: string; updates: Partial<Task> } }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "COMPLETE_TASK"; payload: { taskId: string; childId: string; withTimer: boolean } }
  | { type: "UNCOMPLETE_TASK"; payload: { completionId: string } }
  // Reward Actions
  | { type: "ADD_REWARD"; payload: Omit<Reward, "id"> }
  | { type: "UPDATE_REWARD"; payload: { id: string; updates: Partial<Reward> } }
  | { type: "DELETE_REWARD"; payload: string }
  | { type: "REDEEM_REWARD"; payload: { rewardId: string; childId: string } }
  // Rule Actions
  | { type: "ADD_RULE"; payload: Omit<Rule, "id"> }
  | { type: "UPDATE_RULE"; payload: { id: string; updates: Partial<Rule> } }
  | { type: "DELETE_RULE"; payload: string }
  | { type: "APPLY_RULE"; payload: { ruleId: string; childId: string; note?: string; ruleApplicationId?: string } }
  | { type: "APPROVE_RULE_APPLICATION"; payload: { applicationId: string } }
  | { type: "REJECT_RULE_APPLICATION"; payload: { applicationId: string } }
  // Pet Actions
  | { type: "CREATE_PET"; payload: { childId: string; name: string; type: Pet["type"] } }
  | { type: "FEED_PET"; payload: { petId: string } }
  | { type: "ADD_PET_XP"; payload: { petId: string; xp: number } }
  // Settings Actions
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppSettings> }
  // State Actions
  | { type: "LOAD_STATE"; payload: FamilyState }
  | { type: "IMPORT_STATE"; payload: Partial<FamilyState> }
  | { type: "RESET_STATE" }
  | { type: "UNLOCK_STICKER"; payload: { childId: string; stickerId: string } }
  | { type: "ADD_MOOD"; payload: { childId: string; mood: MoodEntry["mood"]; note?: string } }
  | { type: "UPDATE_WEATHER"; payload: WeatherData }
  | { type: "SET_SCHOOL_TIME"; payload: SchoolTime }

// Mood Entry for Child
export interface MoodEntry {
  id: string
  childId: string
  mood: "great" | "good" | "okay" | "sad" | "angry"
  note?: string
  createdAt: string
}

// Weather Data
export interface WeatherData {
  temperature: number
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy" | "windy"
  clothingTip: string
  lastUpdated: string
  /** Anzeigename des Standorts (z. B. Stadt) */
  locationName?: string
  /** Tages-Minimum (°C) – Open-Meteo daily */
  tempMin?: number
  /** Tages-Maximum (°C) – Open-Meteo daily */
  tempMax?: number
  /** Temperatur ca. 08:00 lokal (°C) */
  tempMorning?: number
  /** Temperatur ca. 16:00 lokal (°C) */
  tempAfternoon?: number
  humidity?: number
  windSpeed?: number
  /** Verwendete Koordinaten (für Transparenz / Debug) */
  lat?: number
  lon?: number
}

// School Time Settings per Child
export interface SchoolTime {
  childId: string
  enabled: boolean
  days: string[] // ['mon', 'tue', ...]
  startTime: string // "08:00"
  endTime: string // "13:00"
}

// Achievement Definition
export interface Achievement {
  id: string
  name: string
  description: string
  emoji: string
  category: "streak" | "tasks" | "points" | "shop" | "special"
  requirement: number // e.g., 7 for "7-day streak"
  rarity: "bronze" | "silver" | "gold" | "platinum"
}

export type RuleCategory = "behavior" | "homework" | "chores" | "social" | "custom"
export type RewardCategory = "experience" | "privilege" | "item" | "special"

// Videos (separates Modul – Re-Export ohne Breaking Changes)
export type { VideoItem, VideoType, VideoSource } from "./video"
