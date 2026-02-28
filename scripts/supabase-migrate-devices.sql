-- ============================================================
-- Migration: devices-Tabelle von sync_id-PK auf device_id-PK
-- ============================================================
-- Nur ausführen, wenn die alte devices-Tabelle (sync_id als PK) existiert.
-- Erstellt die neue Struktur mit device_id als PK und sync_id als Index.

DROP TABLE IF EXISTS devices;

CREATE TABLE devices (
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

-- Realtime für devices aktivieren (im Dashboard unter Database → Replication)
