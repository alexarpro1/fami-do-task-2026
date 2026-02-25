-- sync-v2: Eine Tabelle für das neue Sync-System (unabhängig von family_data/sync_log).
-- Ein Eintrag pro Gerät pro Familien-Code; payload = vollständiges SyncPayload (family + gameProgress).

CREATE TABLE IF NOT EXISTS sync_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code TEXT NOT NULL,
  device_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_code, device_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_v2_family_code ON sync_v2(family_code);
CREATE INDEX IF NOT EXISTS idx_sync_v2_updated_at ON sync_v2(updated_at DESC);

ALTER TABLE sync_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sync_v2" ON sync_v2 FOR ALL USING (true) WITH CHECK (true);
