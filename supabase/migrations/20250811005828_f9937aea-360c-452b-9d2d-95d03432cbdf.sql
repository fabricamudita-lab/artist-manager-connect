-- Build a robust audit trail for solicitudes and decision chat messages
-- 1) Utility: build_changes_json to capture old/new differences
CREATE OR REPLACE FUNCTION public.build_changes_json(old_data jsonb, new_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  k text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  -- Loop through keys of new_data (covers inserts and updates)
  FOR k IN SELECT key FROM jsonb_object_keys(new_data) AS key LOOP
    v_old := old_data -> k;
    v_new := new_data -> k;
    IF v_old IS DISTINCT FROM v_new AND k NOT IN ('updated_at') THEN
      result := result || jsonb_build_object(k, jsonb_build_object('old', v_old, 'new', v_new));
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- 2) Trigger: after INSERT on solicitudes
CREATE OR REPLACE FUNCTION public.trg_log_solicitud_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.solicitud_history (
    solicitud_id,
    estado,
    changes,
    event_type,
    changed_by_profile_id,
    message
  ) VALUES (
    NEW.id,
    NEW.estado,
    to_jsonb(NEW) - 'updated_at',
    'create',
    NEW.created_by,
    'Creación de solicitud'
  );
  RETURN NEW;
END;
$$;

-- 3) Trigger: after UPDATE on solicitudes (capture granular changes)
CREATE OR REPLACE FUNCTION public.trg_log_solicitud_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  changes jsonb;
  changed_by uuid;
BEGIN
  changes := public.build_changes_json(to_jsonb(OLD), to_jsonb(NEW));
  -- Remove noisy/meta keys if present
  changes := changes - 'updated_at' - 'fecha_actualizacion';

  -- If no effective changes, skip
  IF changes IS NULL OR jsonb_typeof(changes) <> 'object' OR jsonb_object_length(changes) = 0 THEN
    RETURN NEW;
  END IF;

  -- Try to resolve current profile id, fallback to creator
  SELECT id INTO changed_by FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF changed_by IS NULL THEN
    changed_by := NEW.created_by; -- assuming created_by references profiles.id
  END IF;

  INSERT INTO public.solicitud_history (
    solicitud_id,
    estado,
    changes,
    event_type,
    changed_by_profile_id,
    message
  ) VALUES (
    NEW.id,
    NEW.estado,
    changes,
    CASE WHEN changes ? 'estado' THEN 'status_change' ELSE 'update' END,
    changed_by,
    'Actualización de solicitud'
  );
  RETURN NEW;
END;
$$;

-- 4) Trigger: after INSERT on solicitud_decision_messages (log comments)
CREATE OR REPLACE FUNCTION public.trg_log_decision_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_estado public.request_status;
  changed_by uuid;
BEGIN
  -- Get the current estado from the parent solicitud
  SELECT s.estado INTO current_estado FROM public.solicitudes s WHERE s.id = NEW.solicitud_id;

  -- Determine author profile id
  changed_by := NEW.author_profile_id;
  IF changed_by IS NULL THEN
    SELECT id INTO changed_by FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  INSERT INTO public.solicitud_history (
    solicitud_id,
    estado,
    changes,
    event_type,
    changed_by_profile_id,
    related_message_id,
    message
  ) VALUES (
    NEW.solicitud_id,
    current_estado,
    '{}'::jsonb,
    'comment',
    changed_by,
    NEW.id,
    NEW.message
  );
  RETURN NEW;
END;
$$;

-- 5) Create triggers if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_solicitudes_history_ins'
  ) THEN
    CREATE TRIGGER trg_solicitudes_history_ins
    AFTER INSERT ON public.solicitudes
    FOR EACH ROW EXECUTE FUNCTION public.trg_log_solicitud_insert();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_solicitudes_history_upd'
  ) THEN
    CREATE TRIGGER trg_solicitudes_history_upd
    AFTER UPDATE ON public.solicitudes
    FOR EACH ROW EXECUTE FUNCTION public.trg_log_solicitud_update();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_decision_messages_history_ins'
  ) THEN
    CREATE TRIGGER trg_decision_messages_history_ins
    AFTER INSERT ON public.solicitud_decision_messages
    FOR EACH ROW EXECUTE FUNCTION public.trg_log_decision_message_insert();
  END IF;
END$$;