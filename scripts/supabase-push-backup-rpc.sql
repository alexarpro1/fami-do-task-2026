-- ============================================================
-- RPC: push_backup_data – Backup-Import ohne RLS-Probleme
-- ============================================================
-- Workaround für RLS: user_metadata.sync_id ist nach updateUser()
-- ggf. nicht sofort im JWT. Diese Funktion läuft mit SECURITY DEFINER
-- und umgeht RLS. Nur authentifizierte User (auth.uid() IS NOT NULL)
-- dürfen sie aufrufen.
--
-- Einmal im Supabase SQL-Editor ausführen (nach supabase-create-all-tables.sql).
-- ============================================================

CREATE OR REPLACE FUNCTION push_backup_data(
  p_sync_id TEXT,
  p_family_state JSONB DEFAULT NULL,
  p_children JSONB DEFAULT '[]',
  p_tasks JSONB DEFAULT '[]',
  p_rewards JSONB DEFAULT '[]',
  p_rules JSONB DEFAULT '[]',
  p_task_completions JSONB DEFAULT '[]',
  p_reward_redemptions JSONB DEFAULT '[]',
  p_rule_applications JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_child_id TEXT := '';
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nicht authentifiziert');
  END IF;

  IF p_family_state IS NOT NULL THEN
    INSERT INTO family_state (sync_id, payload, last_updated)
    VALUES (p_sync_id, p_family_state, now())
    ON CONFLICT (sync_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      last_updated = EXCLUDED.last_updated;
  END IF;

  IF jsonb_array_length(p_children) > 0 THEN
    first_child_id := coalesce((p_children->0->>'id'), '');
  END IF;

  IF jsonb_array_length(p_children) > 0 THEN
    INSERT INTO children (id, sync_id, name, avatar, color, pin, is_active, age)
    SELECT
      (e->>'id')::TEXT,
      p_sync_id,
      coalesce((e->>'name')::TEXT, ''),
      coalesce((e->>'avatar')::TEXT, '👤'),
      coalesce((e->>'color')::TEXT, '#94a3b8'),
      NULL,
      true,
      (e->>'age')::INTEGER
    FROM jsonb_array_elements(p_children) AS e
    ON CONFLICT (id) DO UPDATE SET
      sync_id = EXCLUDED.sync_id,
      name = EXCLUDED.name,
      avatar = EXCLUDED.avatar,
      color = EXCLUDED.color,
      pin = EXCLUDED.pin,
      is_active = EXCLUDED.is_active,
      age = EXCLUDED.age;
  END IF;

  IF jsonb_array_length(p_tasks) > 0 THEN
    INSERT INTO tasks (id, sync_id, title, is_completed, assigned_to, points, description, category, emoji, "order", is_active, days)
    SELECT
      (e->>'id')::TEXT,
      p_sync_id,
      coalesce((e->>'title')::TEXT, ''),
      false,
      coalesce(first_child_id, ''),
      coalesce((e->>'points')::INTEGER, 0),
      (e->>'description')::TEXT,
      (e->>'category')::TEXT,
      (e->>'emoji')::TEXT,
      coalesce((e->>'order')::INTEGER, 0),
      coalesce((e->>'is_active')::BOOLEAN, true),
      (e->>'days')::TEXT
    FROM jsonb_array_elements(p_tasks) AS e
    ON CONFLICT (id) DO UPDATE SET
      sync_id = EXCLUDED.sync_id,
      title = EXCLUDED.title,
      is_completed = EXCLUDED.is_completed,
      assigned_to = EXCLUDED.assigned_to,
      points = EXCLUDED.points,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      emoji = EXCLUDED.emoji,
      "order" = EXCLUDED."order",
      is_active = EXCLUDED.is_active,
      days = EXCLUDED.days;
  END IF;

  IF jsonb_array_length(p_rewards) > 0 THEN
    INSERT INTO rewards (id, sync_id, title, cost, emoji, is_active)
    SELECT
      (e->>'id')::TEXT,
      p_sync_id,
      coalesce((e->>'title')::TEXT, ''),
      coalesce((e->>'cost')::INTEGER, 0),
      coalesce((e->>'emoji')::TEXT, '🎁'),
      coalesce((e->>'is_active')::BOOLEAN, true)
    FROM jsonb_array_elements(p_rewards) AS e
    ON CONFLICT (id) DO UPDATE SET
      sync_id = EXCLUDED.sync_id,
      title = EXCLUDED.title,
      cost = EXCLUDED.cost,
      emoji = EXCLUDED.emoji,
      is_active = EXCLUDED.is_active;
  END IF;

  IF jsonb_array_length(p_rules) > 0 THEN
    INSERT INTO rules (id, sync_id, title, point_impact, emoji, is_active)
    SELECT
      (e->>'id')::TEXT,
      p_sync_id,
      coalesce((e->>'title')::TEXT, ''),
      coalesce((e->>'point_impact')::INTEGER, 0),
      coalesce((e->>'emoji')::TEXT, '⚖️'),
      coalesce((e->>'is_active')::BOOLEAN, true)
    FROM jsonb_array_elements(p_rules) AS e
    ON CONFLICT (id) DO UPDATE SET
      sync_id = EXCLUDED.sync_id,
      title = EXCLUDED.title,
      point_impact = EXCLUDED.point_impact,
      emoji = EXCLUDED.emoji,
      is_active = EXCLUDED.is_active;
  END IF;

  IF jsonb_array_length(p_task_completions) > 0 THEN
    INSERT INTO task_completions (id, sync_id, task_id, child_id, points_awarded, created_at)
    SELECT
      (e->>'id')::TEXT,
      p_sync_id,
      (e->>'task_id')::TEXT,
      (e->>'child_id')::TEXT,
      coalesce((e->>'points_awarded')::INTEGER, 0),
      coalesce((e->>'created_at')::TIMESTAMPTZ, now())
    FROM jsonb_array_elements(p_task_completions) AS e
    ON CONFLICT (id) DO UPDATE SET
      sync_id = EXCLUDED.sync_id,
      task_id = EXCLUDED.task_id,
      child_id = EXCLUDED.child_id,
      points_awarded = EXCLUDED.points_awarded,
      created_at = EXCLUDED.created_at;
  END IF;

  IF jsonb_array_length(p_reward_redemptions) > 0 THEN
    INSERT INTO reward_redemptions (id, sync_id, reward_id, child_id, cost_at_redemption, created_at)
    SELECT
      (e->>'id')::TEXT,
      p_sync_id,
      (e->>'reward_id')::TEXT,
      (e->>'child_id')::TEXT,
      coalesce((e->>'cost_at_redemption')::INTEGER, 0),
      coalesce((e->>'created_at')::TIMESTAMPTZ, now())
    FROM jsonb_array_elements(p_reward_redemptions) AS e
    ON CONFLICT (id) DO UPDATE SET
      sync_id = EXCLUDED.sync_id,
      reward_id = EXCLUDED.reward_id,
      child_id = EXCLUDED.child_id,
      cost_at_redemption = EXCLUDED.cost_at_redemption,
      created_at = EXCLUDED.created_at;
  END IF;

  IF jsonb_array_length(p_rule_applications) > 0 THEN
    INSERT INTO rule_applications (id, sync_id, rule_id, child_id, points_applied, created_at)
    SELECT
      (e->>'id')::TEXT,
      p_sync_id,
      (e->>'rule_id')::TEXT,
      (e->>'child_id')::TEXT,
      coalesce((e->>'points_applied')::INTEGER, 0),
      coalesce((e->>'created_at')::TIMESTAMPTZ, now())
    FROM jsonb_array_elements(p_rule_applications) AS e
    ON CONFLICT (id) DO UPDATE SET
      sync_id = EXCLUDED.sync_id,
      rule_id = EXCLUDED.rule_id,
      child_id = EXCLUDED.child_id,
      points_applied = EXCLUDED.points_applied,
      created_at = EXCLUDED.created_at;
  END IF;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
