-- Fix the notification trigger for solicitud status changes
-- The issue is that artist_id references the artists table, not profiles
-- We need to look up the correct user_id through the artists table

CREATE OR REPLACE FUNCTION public.notify_solicitud_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Only create notification if status actually changed
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Get the user_id through the artists table -> profile relationship
    -- Or use the created_by field as fallback
    SELECT COALESCE(
      (SELECT p.user_id FROM public.profiles p 
       JOIN public.artists a ON a.profile_id = p.id 
       WHERE a.id = NEW.artist_id),
      NEW.created_by
    ) INTO target_user_id;
    
    -- Only insert notification if we have a valid user_id
    IF target_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        related_id
      ) VALUES (
        target_user_id,
        'Solicitud actualizada',
        CASE NEW.estado
          WHEN 'aprobada' THEN 'Tu solicitud "' || COALESCE(NEW.nombre_solicitante, 'Sin nombre') || '" ha sido aprobada'
          WHEN 'denegada' THEN 'Tu solicitud "' || COALESCE(NEW.nombre_solicitante, 'Sin nombre') || '" ha sido denegada'
          ELSE 'Tu solicitud "' || COALESCE(NEW.nombre_solicitante, 'Sin nombre') || '" ha sido actualizada'
        END,
        'request',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;