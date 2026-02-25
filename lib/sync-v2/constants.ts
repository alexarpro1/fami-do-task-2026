/**
 * sync-v2 – Liste aller localStorage-Keys für Spiele-Fortschritt.
 * Nur diese Keys werden in gameProgress gelesen/geschrieben.
 */

export const GAME_PROGRESS_KEYS = [
  "famiapp-chess-save",
  "famiapp-chess-prefs",
  "famiapp-chess-progress",
  "fami-dame-game",
  "fami-dame-prefs",
  "fami-dame-progress",
  "famiapp-reaction-progress",
  "famiapp-memory-progress",
  "famiapp-tap-progress",
  "famiapp-tap-best-seconds",
  "famiapp-color-click-progress",
] as const

export type GameProgressKey = (typeof GAME_PROGRESS_KEYS)[number]
