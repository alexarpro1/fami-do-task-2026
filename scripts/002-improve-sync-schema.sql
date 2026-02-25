-- ============================================
-- FAMIAPP v2.0 BETA - IMPROVED SYNC SCHEMA
-- Granulare Synchronisation statt einem großen JSONB
-- ============================================

-- Drop old approach (keep family_data as backup/fallback)
-- CREATE new tables for granular sync

-- Synced Children
CREATE TABLE IF NOT EXISTS synced_children (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  avatar TEXT,
  color VARCHAR(50),
  points INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  wishlist_reward_ids JSONB DEFAULT '[]',
  achievements JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Synced Tasks
CREATE TABLE IF NOT EXISTS synced_tasks (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  note TEXT,
  points INTEGER DEFAULT 0,
  category VARCHAR(50),
  difficulty VARCHAR(50),
  emoji VARCHAR(10),
  duration INTEGER,
  days JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  task_order INTEGER DEFAULT 0,
  daily_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  start_time VARCHAR(10),
  end_time VARCHAR(10),
  repeat_interval INTEGER,
  timer_options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Synced Task Completions
CREATE TABLE IF NOT EXISTS synced_task_completions (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  task_id VARCHAR(100),
  child_id VARCHAR(100),
  completed_at TIMESTAMPTZ,
  points_earned INTEGER,
  with_timer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synced Rewards
CREATE TABLE IF NOT EXISTS synced_rewards (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL,
  emoji VARCHAR(10),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  stock INTEGER,
  daily_limit INTEGER,
  repeat_interval INTEGER,
  purchase_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Synced Reward Redemptions
CREATE TABLE IF NOT EXISTS synced_reward_redemptions (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  reward_id VARCHAR(100),
  child_id VARCHAR(100),
  redeemed_at TIMESTAMPTZ,
  points_spent INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synced Rules
CREATE TABLE IF NOT EXISTS synced_rules (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  is_positive BOOLEAN DEFAULT true,
  emoji VARCHAR(10),
  category VARCHAR(50),
  daily_limit INTEGER,
  repeat_interval INTEGER,
  is_active BOOLEAN DEFAULT true,
  rule_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Synced Rule Applications
CREATE TABLE IF NOT EXISTS synced_rule_applications (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  rule_id VARCHAR(100),
  child_id VARCHAR(100),
  applied_at TIMESTAMPTZ,
  points_changed INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synced Point Adjustments
CREATE TABLE IF NOT EXISTS synced_point_adjustments (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  child_id VARCHAR(100),
  amount INTEGER NOT NULL,
  reason TEXT,
  adjusted_at TIMESTAMPTZ,
  adjusted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synced Pets
CREATE TABLE IF NOT EXISTS synced_pets (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  child_id VARCHAR(100),
  name VARCHAR(100),
  pet_type VARCHAR(50),
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 100,
  mood VARCHAR(50) DEFAULT 'happy',
  health INTEGER DEFAULT 100,
  last_fed TIMESTAMPTZ,
  evolution_stage INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synced Settings (one per family)
CREATE TABLE IF NOT EXISTS synced_settings (
  family_id UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'de',
  theme VARCHAR(100),
  sound_enabled BOOLEAN DEFAULT true,
  animations_enabled BOOLEAN DEFAULT true,
  admin_pin VARCHAR(100),
  admin_pin_enabled BOOLEAN DEFAULT false,
  timer_sound_enabled BOOLEAN DEFAULT true,
  show_confetti BOOLEAN DEFAULT true,
  pet_system_enabled BOOLEAN DEFAULT true,
  sticker_system_enabled BOOLEAN DEFAULT true,
  weather_enabled BOOLEAN DEFAULT true,
  mood_tracking_enabled BOOLEAN DEFAULT true,
  school_time_enabled BOOLEAN DEFAULT true,
  admin_tab_order JSONB DEFAULT '[]',
  notifications_enabled BOOLEAN DEFAULT true,
  notify_before_minutes INTEGER DEFAULT 15,
  favorite_rule_ids JSONB DEFAULT '[]',
  shop_enabled BOOLEAN DEFAULT true,
  profile_enabled BOOLEAN DEFAULT true,
  parent_notifications_enabled BOOLEAN DEFAULT false,
  daily_summary_enabled BOOLEAN DEFAULT false,
  daily_summary_time VARCHAR(10) DEFAULT '20:00',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Synced Mood Entries
CREATE TABLE IF NOT EXISTS synced_mood_entries (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  child_id VARCHAR(100),
  mood VARCHAR(50),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synced School Times
CREATE TABLE IF NOT EXISTS synced_school_times (
  id VARCHAR(100) PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  child_id VARCHAR(100),
  enabled BOOLEAN DEFAULT true,
  days JSONB DEFAULT '[]',
  start_time VARCHAR(10),
  end_time VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_synced_children_family ON synced_children(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_tasks_family ON synced_tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_task_completions_family ON synced_task_completions(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_rewards_family ON synced_rewards(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_reward_redemptions_family ON synced_reward_redemptions(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_rules_family ON synced_rules(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_rule_applications_family ON synced_rule_applications(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_point_adjustments_family ON synced_point_adjustments(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_pets_family ON synced_pets(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_mood_entries_family ON synced_mood_entries(family_id);
CREATE INDEX IF NOT EXISTS idx_synced_school_times_family ON synced_school_times(family_id);

-- Enable RLS on all tables
ALTER TABLE synced_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_rule_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_point_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_school_times ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for BETA (allow all authenticated users)
CREATE POLICY "Allow all on synced_children" ON synced_children FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_tasks" ON synced_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_task_completions" ON synced_task_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_rewards" ON synced_rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_reward_redemptions" ON synced_reward_redemptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_rules" ON synced_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_rule_applications" ON synced_rule_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_point_adjustments" ON synced_point_adjustments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_pets" ON synced_pets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_settings" ON synced_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_mood_entries" ON synced_mood_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on synced_school_times" ON synced_school_times FOR ALL USING (true) WITH CHECK (true);
