/**
 * SDG = Schach/Dame-Game
 * Hauptkennung im Code für das Brettspiel-Modul (Schach + Dame).
 * Getrennt von anderen Minigames (Reaktion, Memory, etc.), damit sich der Code nicht vermischt.
 */
export const SDG_ID = "sdg" as const

export { ChessGame } from "../chess-game"
export { DameGame } from "../dame-game"
