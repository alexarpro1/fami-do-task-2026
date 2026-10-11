-- ============================================================
-- Phase 18: Regel-Freigaben (pending/approved/rejected) + Device-Rolle
-- ============================================================
-- In Supabase SQL-Editor ausführen. Danach: App-Code anpassen
-- (Typen, Mapper, Reducer, UI) wie in Phase-18-Plan beschrieben.
-- ============================================================

-- 1) Regeln: Bestätigung durch Eltern optional
ALTER TABLE rules
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT false;

-- 2) Regel-Anwendungen: Status (nur approved zählt für Punkte)
ALTER TABLE rule_applications
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE rule_applications
  DROP CONSTRAINT IF EXISTS rule_applications_status_check;
ALTER TABLE rule_applications
  ADD CONSTRAINT rule_applications_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Optional: Index für "Offene Freigaben"-Abfrage
CREATE INDEX IF NOT EXISTS idx_rule_applications_sync_status
  ON rule_applications (sync_id, status)
  WHERE status = 'pending';

-- 3) Devices: Rolle pro Gerät (falls Tabelle ohne role existiert)
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'child';

-- Optional: Constraint für role
ALTER TABLE devices
  DROP CONSTRAINT IF EXISTS devices_role_check;
ALTER TABLE devices
  ADD CONSTRAINT devices_role_check
  CHECK (role IN ('master', 'parent', 'child'));
