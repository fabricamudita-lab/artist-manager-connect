-- 1) Tabla de historial append-only
CREATE TABLE IF NOT EXISTS public.solicitud_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES public.solicitudes(id) ON DELETE CASCADE,
  estado public.request_status NOT NULL,
  condicion TEXT,
  nota TEXT,
  changed_by_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitud_history_solicitud_id ON public.solicitud_history(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_history_changed_at ON public.solicitud_history(changed_at DESC);

-- RLS
ALTER TABLE public.solicitud_history ENABLE ROW LEVEL SECURITY;

-- Solo lectura/insert para usuarios autenticados
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'solicitud_history' AND policyname = 'Users can view solicitud history'
  ) THEN
    CREATE POLICY "Users can view solicitud history"
    ON public.solicitud_history
    FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'solicitud_history' AND policyname = 'Users can insert solicitud history'
  ) THEN
    CREATE POLICY "Users can insert solicitud history"
    ON public.solicitud_history
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- 2) Funciones trigger para registrar historial
CREATE OR REPLACE FUNCTION public.get_profile_id_by_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p.id FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1;
$$;

-- AFTER INSERT: registrar estado inicial
CREATE OR REPLACE FUNCTION public.log_solicitud_history_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Preferimos el profile del creador si viene seteado; si no, el del usuario actual
  v_profile_id := COALESCE(public.get_profile_id_by_user(NEW.created_by), public.get_profile_id_by_user(auth.uid()));

  INSERT INTO public.solicitud_history (
    solicitud_id, estado, condicion, nota, changed_by_profile_id, changed_at
  ) VALUES (
    NEW.id,
    NEW.estado,
    CASE WHEN NEW.estado = 'aprobada' THEN NEW.comentario_estado ELSE NULL END,
    CASE WHEN NEW.estado IN ('pendiente', 'denegada') THEN NEW.comentario_estado ELSE NULL END,
    v_profile_id,
    now()
  );
  RETURN NEW;
END;
$$;

-- AFTER UPDATE: solo cuando cambia el estado
CREATE OR REPLACE FUNCTION public.log_solicitud_history_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    v_profile_id := COALESCE(public.get_profile_id_by_user(auth.uid()), public.get_profile_id_by_user(NEW.decision_por));

    INSERT INTO public.solicitud_history (
      solicitud_id, estado, condicion, nota, changed_by_profile_id, changed_at
    ) VALUES (
      NEW.id,
      NEW.estado,
      CASE WHEN NEW.estado = 'aprobada' THEN NEW.comentario_estado ELSE NULL END,
      CASE WHEN NEW.estado IN ('pendiente', 'denegada') THEN NEW.comentario_estado ELSE NULL END,
      v_profile_id,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers en solicitudes
DROP TRIGGER IF EXISTS trg_log_solicitud_history_on_insert ON public.solicitudes;
CREATE TRIGGER trg_log_solicitud_history_on_insert
AFTER INSERT ON public.solicitudes
FOR EACH ROW
EXECUTE FUNCTION public.log_solicitud_history_on_insert();

DROP TRIGGER IF EXISTS trg_log_solicitud_history_on_update ON public.solicitudes;
CREATE TRIGGER trg_log_solicitud_history_on_update
AFTER UPDATE OF estado, comentario_estado ON public.solicitudes
FOR EACH ROW
EXECUTE FUNCTION public.log_solicitud_history_on_update();