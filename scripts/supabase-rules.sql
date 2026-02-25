-- ============================================================
-- Supabase: Tabellen rules + rule_applications (Phase 12 – Economy)
-- ============================================================
-- Im Supabase-Dashboard: SQL Editor öffnen und dieses Skript ausführen.
--
-- Inhalt:
-- 1. Tabelle rules anlegen
-- 2. Tabelle rule_applications anlegen
-- 3. RLS für beide + Policies (authenticated)
-- 4. Beide Tabellen zur PowerSync-Publication hinzufügen
-- ============================================================

-- 1. Regeln (Boni/Strafen)
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  point_impact INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_rules_is_active ON rules(is_active);

ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familien dürfen Regeln sehen und bearbeiten"
ON rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Anwendungen (Punkte zum Anwendungszeitpunkt)
CREATE TABLE IF NOT EXISTS rule_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL,
  points_applied INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rule_applications_child_id ON rule_applications(child_id);
CREATE INDEX IF NOT EXISTS idx_rule_applications_rule_id ON rule_applications(rule_id);

ALTER TABLE rule_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familien dürfen Regel-Anwendungen sehen und anlegen"
ON rule_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. PowerSync-Publication
ALTER PUBLICATION powersync ADD TABLE rules;
ALTER PUBLICATION powersync ADD TABLE rule_applications;
