-- v2.0 BETA: Familien-Sync System
-- Erstellt die notwendigen Tabellen fuer das Familien-Sync System

-- 1. Families Tabelle - Haupttabelle fuer Familien
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  family_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Family Members Tabelle - Geraete/Mitglieder einer Familie
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('master', 'parent', 'child')),
  child_id TEXT, -- Referenz zum lokalen Kind-Profil
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, device_id)
);

-- 3. Family Data Tabelle - Synchronisierte App-Daten
CREATE TABLE IF NOT EXISTS family_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL, -- 'full_state', 'tasks', 'rules', 'rewards', 'children', 'settings'
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  updated_by TEXT, -- device_id des letzten Bearbeiters
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, data_type)
);

-- 4. Sync Log Tabelle - Protokoll aller Sync-Aktionen
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'push', 'pull', 'conflict_resolved'
  data_type TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes fuer schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_device_id ON family_members(device_id);
CREATE INDEX IF NOT EXISTS idx_family_data_family_id ON family_data(family_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_family_id ON sync_log(family_id);
CREATE INDEX IF NOT EXISTS idx_families_code ON families(family_code);

-- RLS (Row Level Security) aktivieren
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Erlaubt allen authentifizierten und anonymen Benutzern Zugriff
-- (Fuer Familien-App ohne Account-Zwang)
CREATE POLICY "Allow all access to families" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to family_members" ON family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to family_data" ON family_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sync_log" ON sync_log FOR ALL USING (true) WITH CHECK (true);
