-- ============================================================
-- Supabase Row Level Security (RLS) für die Tabelle "tasks"
-- ============================================================
-- Im Supabase-Dashboard: SQL Editor öffnen und dieses Skript ausführen.
-- Ohne RLS blockiert Supabase Zugriffe von PowerSync (auch für eingeloggte User).
--
-- Was es macht:
-- - RLS für "tasks" aktivieren
-- - Policy: Jeder EINGELOGGTE User (authenticated) darf alle Zeilen lesen/schreiben.
--   Ohne Login werden alle Zugriffe abgelehnt.
-- ============================================================

-- 1. Row Level Security für die Tabelle aktivieren
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Jeder eingeloggte User darf alles lesen und schreiben
CREATE POLICY "Familien dürfen Tasks sehen und bearbeiten"
ON tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
