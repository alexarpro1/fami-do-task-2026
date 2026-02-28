-- ============================================================
-- Phase 14: Alle Tabellen für Cloud-Sync (Device ID) anlegen
-- ============================================================
-- Einmal im Supabase SQL-Editor ausführen. Legt alle Tabellen
-- mit sync_id und RLS an (TEXT-IDs für App-Kompatibilität).
-- Realtime: Im Dashboard für die Tabellen aktivieren.
--
-- Anonymous Sign-In: Die App nutzt signInAnonymously() und setzt
-- user_metadata.sync_id. Anonymous User haben die Rolle "authenticated",
-- daher greifen die Policies "TO authenticated" mit sync_id-Check.
-- Optional: is_anonymous im JWT prüfen (auth.jwt()->>'is_anonymous').
--
-- Optional – Aufräumen alter anonymer User (z. B. alle 30 Tage ausführen):
--   DELETE FROM auth.users
--   WHERE is_anonymous IS TRUE AND created_at < now() - interval '30 days';
-- ============================================================

-- 0. Geräte-Metadaten (ein Eintrag pro Gerät, mehrere pro Sync-Code)
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'Unbekannt',
  role TEXT NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  os_version TEXT,
  device_model TEXT,
  region_timezone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_devices_sync_id ON devices(sync_id);
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "devices_sync_id" ON devices;
CREATE POLICY "devices_sync_id"
ON devices FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 1. Kinder
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '👤',
  color TEXT NOT NULL DEFAULT '#94a3b8',
  pin TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  age INTEGER
);
CREATE INDEX IF NOT EXISTS idx_children_sync_id ON children(sync_id);
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "children_sync_id" ON children;
CREATE POLICY "children_sync_id"
ON children FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 2. Aufgaben
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT,
  emoji TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  days TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_sync_id ON tasks(sync_id);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_sync_id" ON tasks;
CREATE POLICY "tasks_sync_id"
ON tasks FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 3. Task-Completions
CREATE TABLE IF NOT EXISTS task_completions (
  id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  task_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_task_completions_sync_id ON task_completions(sync_id);
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_completions_sync_id" ON task_completions;
CREATE POLICY "task_completions_sync_id"
ON task_completions FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 4. Belohnungen
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL DEFAULT '🎁',
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_rewards_sync_id ON rewards(sync_id);
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rewards_sync_id" ON rewards;
CREATE POLICY "rewards_sync_id"
ON rewards FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 5. Einlösungen
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  cost_at_redemption INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_sync_id ON reward_redemptions(sync_id);
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reward_redemptions_sync_id" ON reward_redemptions;
CREATE POLICY "reward_redemptions_sync_id"
ON reward_redemptions FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 6. Regeln
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  point_impact INTEGER NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL DEFAULT '⚖️',
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_rules_sync_id ON rules(sync_id);
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rules_sync_id" ON rules;
CREATE POLICY "rules_sync_id"
ON rules FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 7. Regel-Anwendungen
CREATE TABLE IF NOT EXISTS rule_applications (
  id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rule_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  points_applied INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rule_applications_sync_id ON rule_applications(sync_id);
ALTER TABLE rule_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rule_applications_sync_id" ON rule_applications;
CREATE POLICY "rule_applications_sync_id"
ON rule_applications FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 8. Full-App Snapshot (Settings, Münzen, Pets, Games, etc.)
CREATE TABLE IF NOT EXISTS family_state (
  sync_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_family_state_last_updated ON family_state(last_updated DESC);
ALTER TABLE family_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "family_state_sync_id" ON family_state;
CREATE POLICY "family_state_sync_id"
ON family_state FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- 9. Audit-Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id TEXT NOT NULL,
  device_id TEXT,
  event_type TEXT NOT NULL,
  entity_name TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sync_id ON audit_logs(sync_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_sync_id" ON audit_logs;
CREATE POLICY "audit_logs_sync_id"
ON audit_logs FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));

-- Optional: RPC für Backup-Import (umgeht RLS bei user_metadata-Problemen)
-- scripts/supabase-push-backup-rpc.sql ausführen
