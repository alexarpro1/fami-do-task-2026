-- ============================================================
-- Phase 14 (V2): Device-ID Sync für bestehendes Schema
-- ============================================================
-- Dieses Skript migriert bestehende Tabellen:
-- 1) devices + audit_logs + family_state sicherstellen
-- 2) ALLEN Tabellen im public-Schema eine sync_id-Spalte geben
-- 3) RLS-Policy je Tabelle auf sync_id im JWT (user_metadata.sync_id)
-- ============================================================

-- 0) Basis-Tabellen für Session/Audit/Full-State
CREATE TABLE IF NOT EXISTS devices (
  sync_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  os_version TEXT,
  device_model TEXT,
  region_timezone TEXT,
  last_ip TEXT,
  location_data JSONB
);

CREATE TABLE IF NOT EXISTS family_state (
  sync_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

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

-- 1) Alle Tabellen im public-Schema mit sync_id + RLS absichern
DO $$
DECLARE
  rec RECORD;
  policy_name TEXT;
  index_name TEXT;
BEGIN
  FOR rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
  LOOP
    -- sync_id-Spalte ergänzen (wenn nicht vorhanden)
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sync_id TEXT;', rec.tablename);

    -- Index ergänzen (stabiler Name je Tabelle)
    index_name := format('idx_%s_sync_id', rec.tablename);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(sync_id);', index_name, rec.tablename);

    -- RLS aktivieren
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', rec.tablename);

    -- Policy neu setzen
    policy_name := format('%s_sync_id', rec.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_name, rec.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated ' ||
      'USING (sync_id = coalesce(auth.jwt() -> ''user_metadata'' ->> ''sync_id'', '''')) ' ||
      'WITH CHECK (sync_id = coalesce(auth.jwt() -> ''user_metadata'' ->> ''sync_id'', ''''));',
      policy_name,
      rec.tablename
    );
  END LOOP;
END $$;
