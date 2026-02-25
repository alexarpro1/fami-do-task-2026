-- ============================================================
-- Supabase: Tabellen rewards + reward_redemptions (Phase 10 – Economy)
-- ============================================================
-- Im Supabase-Dashboard: SQL Editor öffnen und dieses Skript ausführen.
--
-- Inhalt:
-- 1. Tabelle rewards anlegen
-- 2. Tabelle reward_redemptions anlegen
-- 3. RLS für beide + Policies (authenticated)
-- 4. Beide Tabellen zur PowerSync-Publication hinzufügen
-- ============================================================

-- 1. Belohnungen
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  cost INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON rewards(is_active);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familien dürfen Belohnungen sehen und bearbeiten"
ON rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Einlösungen (Kassenbuch)
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL,
  cost_at_redemption INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_child_id ON reward_redemptions(child_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familien dürfen Einlösungen sehen und anlegen"
ON reward_redemptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. PowerSync-Publication
ALTER PUBLICATION powersync ADD TABLE rewards;
ALTER PUBLICATION powersync ADD TABLE reward_redemptions;
