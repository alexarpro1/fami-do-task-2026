-- ============================================================
-- App-Updates: Force-Flag (optional), Download nur Allowlist
-- ============================================================
-- Einmal im Supabase SQL-Editor ausfuehren.
-- Die App liest primar GitHub Releases (version.json).
-- Supabase app_updates: nur force_update / min_required_version.
-- download_url wird vom Client nur genutzt wenn Host-Allowlist matcht.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_updates (
  id TEXT PRIMARY KEY DEFAULT 'default',
  latest_version TEXT NOT NULL,
  force_update BOOLEAN NOT NULL DEFAULT false,
  download_url TEXT,
  min_required_version TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration falls Tabelle schon existiert
ALTER TABLE app_updates ADD COLUMN IF NOT EXISTS min_required_version TEXT;

INSERT INTO app_updates (id, latest_version, force_update, download_url, min_required_version)
VALUES (
  'default',
  '2.6.1.35',
  false,
  'https://github.com/alexarpro1/fami-do-task-2026/releases/latest/download/FamiApp-latest.apk',
  NULL
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_updates_read_anon" ON app_updates;
CREATE POLICY "app_updates_read_anon"
ON app_updates FOR SELECT TO anon
USING (true);

DROP POLICY IF EXISTS "app_updates_read_authenticated" ON app_updates;
CREATE POLICY "app_updates_read_authenticated"
ON app_updates FOR SELECT TO authenticated
USING (true);
