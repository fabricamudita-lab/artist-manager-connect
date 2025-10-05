-- Actualizar TODOS los triggers para convertir correctamente user_id a profile_id

-- Función auxiliar para obtener profile_id de manera segura
CREATE OR REPLACE FUNCTION public.safe_get_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró perfil para user_id: %', _user_id;
  END IF;
  
  RETURN v_profile_id;
END;
$$;

-- Actualizar trg_log_solicitud_insert para usar la conversión correcta
CREATE OR REPLACE FUNCTION public.trg_log_solicitud_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Convertir user_id a profile_id
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = NEW.created_by LIMIT 1;
  
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
    v_profile_id,
    'Creación de solicitud'
  );
  RETURN NEW;
END;
$function$;

-- Actualizar trg_log_solicitud_update para usar la conversión correcta
CREATE OR REPLACE FUNCTION public.trg_log_solicitud_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  changes jsonb;
  changed_by uuid;
  change_count integer;
BEGIN
  -- Build the JSON diff and remove noisy fields
  changes := public.build_changes_json(to_jsonb(OLD), to_jsonb(NEW));
  changes := changes - 'updated_at' - 'fecha_actualizacion';

  IF changes IS NULL OR jsonb_typeof(changes) <> 'object' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO change_count FROM jsonb_object_keys(changes);
  IF COALESCE(change_count, 0) = 0 THEN
    RETURN NEW;
  END IF;

  -- Convertir auth.uid() a profile_id
  SELECT id INTO changed_by FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF changed_by IS NULL THEN
    -- Si no hay usuario autenticado, usar el created_by convertido a profile_id
    SELECT id INTO changed_by FROM public.profiles WHERE user_id = NEW.created_by LIMIT 1;
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
$function$;