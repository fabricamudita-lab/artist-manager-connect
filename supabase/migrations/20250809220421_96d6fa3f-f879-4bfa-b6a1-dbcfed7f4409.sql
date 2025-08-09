-- Chat de decisión: tabla de mensajes por solicitud

-- 1) Tabla de mensajes
CREATE TABLE IF NOT EXISTS public.solicitud_decision_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL REFERENCES public.solicitudes(id) ON DELETE CASCADE,
  author_profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name text NULL,
  is_system boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitud_decision_messages ENABLE ROW LEVEL SECURITY;

-- RLS (coherente con el resto del proyecto: autenticados)
CREATE POLICY "Authenticated can insert decision messages"
ON public.solicitud_decision_messages
FOR INSERT TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can select decision messages"
ON public.solicitud_decision_messages
FOR SELECT TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update decision messages"
ON public.solicitud_decision_messages
FOR UPDATE TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete decision messages"
ON public.solicitud_decision_messages
FOR DELETE TO authenticated
USING (auth.role() = 'authenticated');

-- 2) Indicador de nuevo comentario en solicitudes
ALTER TABLE public.solicitudes
ADD COLUMN IF NOT EXISTS decision_has_new_comment boolean NOT NULL DEFAULT false;

-- 3) Trigger para marcar nuevo comentario y refrescar fecha_actualizacion
CREATE OR REPLACE FUNCTION public.on_decision_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.solicitudes
  SET decision_has_new_comment = true,
      fecha_actualizacion = now()
  WHERE id = NEW.solicitud_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_decision_message_insert ON public.solicitud_decision_messages;
CREATE TRIGGER trg_on_decision_message_insert
AFTER INSERT ON public.solicitud_decision_messages
FOR EACH ROW EXECUTE FUNCTION public.on_decision_message_insert();

-- 4) Mensaje de sistema cuando cambia el estado
CREATE OR REPLACE FUNCTION public.log_decision_message_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.solicitud_decision_messages (solicitud_id, author_profile_id, is_system, message)
    VALUES (
      NEW.id,
      public.get_profile_id_by_user(COALESCE(NEW.decision_por, auth.uid())),
      true,
      'Estado cambiado a ' || NEW.estado || COALESCE(' — Comentario: ' || NEW.comentario_estado, '')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_decision_message_on_status_change ON public.solicitudes;
CREATE TRIGGER trg_log_decision_message_on_status_change
AFTER UPDATE ON public.solicitudes
FOR EACH ROW EXECUTE FUNCTION public.log_decision_message_on_status_change();

-- 5) Realtime (opcional pero recomendado)
ALTER TABLE public.solicitud_decision_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitud_decision_messages';
EXCEPTION WHEN others THEN
  -- Si ya está añadida, ignorar
  NULL;
END $$;