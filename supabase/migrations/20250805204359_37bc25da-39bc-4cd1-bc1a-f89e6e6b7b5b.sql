-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.update_solicitudes_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_solicitud_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only create notification if status actually changed
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      related_id
    ) VALUES (
      (SELECT user_id FROM public.profiles WHERE id = NEW.artist_id),
      'Solicitud actualizada',
      CASE NEW.estado
        WHEN 'aprobada' THEN 'Tu solicitud "' || NEW.nombre_solicitante || '" ha sido aprobada'
        WHEN 'denegada' THEN 'Tu solicitud "' || NEW.nombre_solicitante || '" ha sido denegada'
        ELSE 'Tu solicitud "' || NEW.nombre_solicitante || '" ha sido actualizada'
      END,
      'request',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;