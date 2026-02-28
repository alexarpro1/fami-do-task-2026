-- ============================================================
-- Phase 15: devices-Tabelle pro Gerät (device_id), nicht pro Code
-- ============================================================
-- Ein Eintrag pro Gerät; mehrere Geräte teilen dieselbe sync_id.
-- Nach Ausführung: App nutzt id = device_id, sync_id, device_name, last_active.
-- ============================================================

DROP TABLE IF EXISTS devices;

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  sync_id TEXT NOT NULL,
  device_name TEXT,
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  os_version TEXT,
  device_model TEXT,
  region_timezone TEXT,
  last_ip TEXT,
  location_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_devices_sync_id ON devices(sync_id);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devices_sync_id" ON devices;
CREATE POLICY "devices_sync_id"
ON devices FOR ALL TO authenticated
USING (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''))
WITH CHECK (sync_id = coalesce(auth.jwt() -> 'user_metadata' ->> 'sync_id', ''));
