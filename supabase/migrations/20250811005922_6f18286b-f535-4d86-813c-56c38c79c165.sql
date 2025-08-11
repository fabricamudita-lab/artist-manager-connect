-- Harden newly added functions by setting search_path explicitly
CREATE OR REPLACE FUNCTION public.build_changes_json(old_data jsonb, new_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  k text;
  v_old jsonb;
  v_new jsonb;
BEGIN
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

CREATE OR REPLACE FUNCTION public.trg_log_solicitud_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.trg_log_solicitud_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  changes jsonb;
  changed_by uuid;
BEGIN
  changes := public.build_changes_json(to_jsonb(OLD), to_jsonb(NEW));
  changes := changes - 'updated_at' - 'fecha_actualizacion';

  IF changes IS NULL OR jsonb_typeof(changes) <> 'object' OR jsonb_object_length(changes) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO changed_by FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF changed_by IS NULL THEN
    changed_by := NEW.created_by;
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

CREATE OR REPLACE FUNCTION public.trg_log_decision_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_estado public.request_status;
  changed_by uuid;
BEGIN
  SELECT s.estado INTO current_estado FROM public.solicitudes s WHERE s.id = NEW.solicitud_id;

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