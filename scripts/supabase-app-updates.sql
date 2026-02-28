-- ============================================================
-- Phase 16: App-Updates (OTA / Forced Update)
-- ============================================================
-- Einmal im Supabase SQL-Editor ausführen.
-- Die App liest beim Start: latest_version, force_update, download_url.
-- Nur lesen für anon/authenticated; Änderungen nur im Dashboard.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_updates (
  id TEXT PRIMARY KEY DEFAULT 'default',
  latest_version TEXT NOT NULL,
  force_update BOOLEAN NOT NULL DEFAULT false,
  download_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Einmal einen Eintrag anlegen (danach im Dashboard pflegen)
INSERT INTO app_updates (id, latest_version, force_update, download_url)
VALUES (
  'default',
  '2.6.0.18',
  false,
  'https://drive.google.com/drive/folders/1NytAIHGZPlLOZHUp8qw1Aa3WqCCngzKl?usp=sharing'
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
