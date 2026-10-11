-- ============================================================
-- Videos-Tabelle (YouTube / MP4) fuer Familien-Sync
-- ============================================================
-- Voraussetzungen:
--   1. supabase-create-all-tables.sql (bzw. bestehende Sync-Tabellen)
--   2. 008-critical-sync-security.sql (is_sync_member, sync_member_role)
--
-- Idempotent. Manuell im Supabase SQL-Editor ausfuehren.
-- KEINE automatische Live-Migration.
--
-- Storage (separat, manuell im Dashboard):
--   Bucket-Name: famiapp-videos
--   Public: ja (oeffentliche MP4-URLs fuer Upload + Player)
--   Siehe SUPABASE_SETUP.md Abschnitt „Videos“.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT videos_type_check CHECK (type IN ('youtube', 'mp4'))
);

-- Nachruestung falls eine aeltere Tabellenfassung ohne Spalten existiert
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS sync_id TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $videos_constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'videos_type_check'
      AND conrelid = 'public.videos'::regclass
  ) THEN
    ALTER TABLE public.videos
      ADD CONSTRAINT videos_type_check CHECK (type IN ('youtube', 'mp4'));
  END IF;
END
$videos_constraints$;

CREATE INDEX IF NOT EXISTS idx_videos_sync_id ON public.videos (sync_id);
CREATE INDEX IF NOT EXISTS idx_videos_sync_updated
  ON public.videos (sync_id, updated_at DESC);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.videos FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.videos TO authenticated;

DROP POLICY IF EXISTS videos_member_select ON public.videos;
DROP POLICY IF EXISTS videos_parent_insert ON public.videos;
DROP POLICY IF EXISTS videos_parent_update ON public.videos;
DROP POLICY IF EXISTS videos_parent_delete ON public.videos;

-- SELECT: alle Sync-Mitglieder (inkl. Kind)
CREATE POLICY videos_member_select
  ON public.videos
  FOR SELECT
  TO authenticated
  USING (public.is_sync_member(sync_id));

-- INSERT / UPDATE / DELETE: nur parent | master
CREATE POLICY videos_parent_insert
  ON public.videos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.sync_member_role(sync_id) IN ('master', 'parent'));

CREATE POLICY videos_parent_update
  ON public.videos
  FOR UPDATE
  TO authenticated
  USING (public.sync_member_role(sync_id) IN ('master', 'parent'))
  WITH CHECK (public.sync_member_role(sync_id) IN ('master', 'parent'));

CREATE POLICY videos_parent_delete
  ON public.videos
  FOR DELETE
  TO authenticated
  USING (public.sync_member_role(sync_id) IN ('master', 'parent'));
