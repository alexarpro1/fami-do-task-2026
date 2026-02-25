/**
 * PowerSync Client-Side Schema
 * Für die lokale SQLite-Datenbank (Offline-First).
 * Die Spalte "id" wird von PowerSync automatisch ergänzt (text), nicht im Schema angeben.
 *
 * Sync Rules im PowerSync-Dashboard müssen zu diesen Tabellen/Spalten passen.
 */

import { column, Schema, Table } from "@powersync/web"

/** Aufgaben – Sync mit Supabase; Mindestfelder für Phase 1 */
export const tasks = new Table(
  {
    created_at: column.text,
    title: column.text,
    is_completed: column.integer, // SQLite: 0/1
    assigned_to: column.text, // child_id
    points: column.integer,
    // Optionale Felder, die ihr bestehendes Task-Modell erweitern können:
    description: column.text,
    category: column.text,
    emoji: column.text,
    order: column.integer,
    is_active: column.integer,
    days: column.text, // JSON-Array z. B. '["mon","tue"]'
  },
  { indexes: { by_assigned_to: ["assigned_to"] } }
)

/**
 * Task-Completions (Logbuch) – wer wann welche Aufgabe erledigt hat und wie viele Punkte.
 * Single Source of Truth für erledigte Aufgaben und Punkte (Phase 7).
 * PowerSync erwartet eine id-Spalte (text) als Primary Key.
 */
export const task_completions = new Table(
  {
    id: column.text,
    created_at: column.text,
    task_id: column.text,
    child_id: column.text,
    points_awarded: column.integer,
  },
  {
    indexes: {
      by_child_id: ["child_id"],
      by_task_id: ["task_id"],
    },
  }
)

/**
 * Kinder-Profile (Phase 9) – Single Source of Truth für Namen, Avatar, Farbe.
 * Referenziert von tasks.assigned_to und task_completions.child_id.
 */
export const children = new Table(
  {
    id: column.text,
    created_at: column.text,
    name: column.text,
    avatar: column.text,
    color: column.text,
    pin: column.text,
    is_active: column.integer,
    age: column.integer,
  },
  {
    indexes: { by_is_active: ["is_active"] },
  }
)

/**
 * Belohnungen (Phase 10) – Wunschliste / Shop.
 */
export const rewards = new Table(
  {
    id: column.text,
    created_at: column.text,
    title: column.text,
    cost: column.integer,
    emoji: column.text,
    is_active: column.integer,
  },
  { indexes: { by_is_active: ["is_active"] } }
)

/**
 * Einlösungen (Redemptions) – ausgegebene Punkte pro Kind.
 * Kontostand = SUM(task_completions) - SUM(reward_redemptions) + SUM(rule_applications).
 */
export const reward_redemptions = new Table(
  {
    id: column.text,
    created_at: column.text,
    reward_id: column.text,
    child_id: column.text,
    cost_at_redemption: column.integer,
  },
  {
    indexes: {
      by_child_id: ["child_id"],
      by_reward_id: ["reward_id"],
    },
  }
)

/**
 * Regeln (Phase 12) – Boni/Strafen mit Punktwirkung.
 */
export const rules = new Table(
  {
    id: column.text,
    created_at: column.text,
    title: column.text,
    point_impact: column.integer,
    emoji: column.text,
    is_active: column.integer,
  },
  { indexes: { by_is_active: ["is_active"] } }
)

/**
 * Anwendungen von Regeln – wer wann welche Regel bekommen hat (Punkte zum Anwendungszeitpunkt).
 */
export const rule_applications = new Table(
  {
    id: column.text,
    created_at: column.text,
    rule_id: column.text,
    child_id: column.text,
    points_applied: column.integer,
  },
  {
    indexes: {
      by_child_id: ["child_id"],
      by_rule_id: ["rule_id"],
    },
  }
)

export const AppSchema = new Schema({
  tasks,
  task_completions,
  children,
  rewards,
  reward_redemptions,
  rules,
  rule_applications,
})

/** Typen für TypeScript (z. B. bei db.get/db.getAll) */
export type Database = (typeof AppSchema)["types"]
export type TaskRecord = Database["tasks"]
export type TaskCompletionRecord = Database["task_completions"]
export type ChildRecord = Database["children"]
export type RewardRecord = Database["rewards"]
export type RewardRedemptionRecord = Database["reward_redemptions"]
export type RuleRecord = Database["rules"]
export type RuleApplicationRecord = Database["rule_applications"]
