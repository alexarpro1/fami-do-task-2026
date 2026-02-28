-- ============================================================
-- Phase 15: RPC get_cloud_preview – lesender Abruf für fremden Code
-- ============================================================
-- Ermöglicht Safe-Sync-Modal: Cloud-Daten für eingegebenen Code
-- abrufen, ohne JWT zu wechseln. SECURITY DEFINER = liest unabhängig von RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION get_cloud_preview(p_sync_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  row_count bigint;
  payload_data JSONB;
  last_updated_val TIMESTAMPTZ;
  children_count int;
  tasks_count int;
  rewards_count int;
BEGIN
  IF p_sync_id IS NULL OR length(trim(p_sync_id)) < 1 THEN
    RETURN jsonb_build_object('error', 'sync_id required');
  END IF;

  SELECT fs.payload, fs.last_updated
  INTO payload_data, last_updated_val
  FROM family_state fs
  WHERE fs.sync_id = trim(p_sync_id)
  LIMIT 1;

  IF payload_data IS NOT NULL AND jsonb_typeof(payload_data) = 'object' THEN
    children_count := coalesce(jsonb_array_length(payload_data -> 'children'), 0);
    tasks_count := coalesce(jsonb_array_length(payload_data -> 'tasks'), 0);
    rewards_count := coalesce(jsonb_array_length(payload_data -> 'rewards'), 0);
    result := jsonb_build_object(
      'children_count', children_count,
      'tasks_count', tasks_count,
      'rewards_count', rewards_count,
      'last_updated', last_updated_val,
      'payload', payload_data
    );
  ELSE
    result := jsonb_build_object(
      'children_count', 0,
      'tasks_count', 0,
      'rewards_count', 0,
      'last_updated', null,
      'payload', '{}'::jsonb
    );
  END IF;

  RETURN result;
END;
$$;

-- Anon/authenticated dürfen die Funktion aufrufen (sie prüft nur den Parameter)
GRANT EXECUTE ON FUNCTION get_cloud_preview(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_cloud_preview(TEXT) TO authenticated;
