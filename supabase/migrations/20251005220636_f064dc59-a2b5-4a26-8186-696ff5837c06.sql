-- Corregir el trigger para convertir correctamente user_id a profile_id
CREATE OR REPLACE FUNCTION public.log_solicitud_history_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Convertir el created_by (user_id) a profile_id
  v_profile_id := public.get_profile_id_by_user(NEW.created_by);
  
  -- Si no se encuentra el perfil, usar el created_by directamente como fallback
  IF v_profile_id IS NULL THEN
    v_profile_id := NEW.created_by;
  END IF;

  INSERT INTO public.solicitud_history (
    solicitud_id, 
    estado, 
    condicion, 
    nota, 
    changed_by_profile_id, 
    changed_at, 
    event_type, 
    changes
  ) VALUES (
    NEW.id,
    NEW.estado,
    CASE WHEN NEW.estado = 'aprobada' THEN NEW.comentario_estado ELSE NULL END,
    CASE WHEN NEW.estado IN ('pendiente', 'denegada') THEN NEW.comentario_estado ELSE NULL END,
    v_profile_id,  -- Usar el profile_id convertido
    now(),
    'create',
    jsonb_build_object('new', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$function$;