-- ============================================================
-- Supabase: Tabelle children (Phase 9 – Kinder-Profile in der Cloud)
-- ============================================================
-- Im Supabase-Dashboard: SQL Editor öffnen und dieses Skript ausführen.
--
-- Inhalt:
-- 1. Tabelle children anlegen
-- 2. RLS aktivieren + Policy (authenticated darf lesen/schreiben)
-- 3. Tabelle zur PowerSync-Publication hinzufügen
-- ============================================================

-- 1. Tabelle anlegen
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  color TEXT NOT NULL,
  pin TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  age INTEGER
);

CREATE INDEX IF NOT EXISTS idx_children_is_active ON children(is_active);

-- 2. Row Level Security
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familien dürfen Kinder-Profile sehen und bearbeiten"
ON children
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. PowerSync-Publication
ALTER PUBLICATION powersync ADD TABLE children;
