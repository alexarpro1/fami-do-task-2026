-- Moved from scripts/001-create-family-sync-tables.sql
-- Moving to beta archive

-- v2.0 BETA: Familien-Sync System
-- Erstellt die notwendigen Tabellen fuer das Familien-Sync System

-- 1. Families Tabelle - Kern der Familienstruktur
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Family Members Tabelle - Geraete in einer Familie
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'master', 'admin', 'child'
  child_id VARCHAR(100), -- Falls role='child', welches Kind
  device_name VARCHAR(100),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Family Data Tabelle - Synchronisierte App-Daten
CREATE TABLE IF NOT EXISTS family_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- 'children', 'tasks', 'rewards', etc.
  data JSONB NOT NULL,
  updated_by VARCHAR(100), -- device_id
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sync Log Tabelle - History aller Sync-Operationen
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  device_id VARCHAR(100),
  action VARCHAR(50), -- 'create', 'update', 'delete', 'sync'
  entity_type VARCHAR(50), -- 'child', 'task', etc.
  entity_id VARCHAR(100),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices fuer Performance
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_data_family_id ON family_data(family_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_family_id ON sync_log(family_id);

-- RLS Policies (Row Level Security)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
