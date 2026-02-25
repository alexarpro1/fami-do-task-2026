-- ============================================================
-- Supabase: Tabelle task_completions (Phase 7 – Single Source of Truth)
-- ============================================================
-- Im Supabase-Dashboard: SQL Editor öffnen und dieses Skript ausführen.
-- Voraussetzung: Tabelle "tasks" existiert bereits.
--
-- Inhalt:
-- 1. Tabelle task_completions anlegen
-- 2. RLS aktivieren + Policy (authenticated darf lesen/schreiben)
-- 3. Tabelle zur PowerSync-Publication hinzufügen
-- ============================================================

-- 1. Tabelle anlegen
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL,
  points_awarded INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_completions_child_id ON task_completions(child_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);

-- 2. Row Level Security
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familien dürfen Completions sehen und anlegen"
ON task_completions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. PowerSync-Publication (eine Zeile ausführen)
-- Falls bereits eine Publication "powersync" existiert (nur mit tasks):
ALTER PUBLICATION powersync ADD TABLE task_completions;
-- Falls Sie die Publication erst anlegen:
-- CREATE PUBLICATION powersync FOR TABLE tasks, task_completions;
