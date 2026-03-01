-- Booking checkpoints table for automated workflow tracking
CREATE TABLE public.booking_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_offer_id UUID NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by booking
CREATE INDEX idx_booking_checkpoints_booking ON public.booking_checkpoints(booking_offer_id);
CREATE INDEX idx_booking_checkpoints_status ON public.booking_checkpoints(status, due_date);

-- RLS
ALTER TABLE public.booking_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_checkpoints_select" ON public.booking_checkpoints
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "booking_checkpoints_insert" ON public.booking_checkpoints
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "booking_checkpoints_update" ON public.booking_checkpoints
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "booking_checkpoints_delete" ON public.booking_checkpoints
  FOR DELETE TO authenticated USING (true);

-- Buddy dismissed items table (for 24h dismiss tracking)
CREATE TABLE public.buddy_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buddy_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buddy_dismissals_own" ON public.buddy_dismissals
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_buddy_dismissals_user ON public.buddy_dismissals(user_id, dismissed_at);

-- Function to auto-generate checkpoints on phase transition
CREATE OR REPLACE FUNCTION public.generate_booking_checkpoints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_event_date DATE;
BEGIN
  v_event_date := NEW.fecha;

  -- On confirmation
  IF NEW.phase = 'confirmado' AND (OLD.phase IS NULL OR OLD.phase <> 'confirmado') THEN
    -- Delete any existing pending checkpoints for this booking from a previous phase
    DELETE FROM public.booking_checkpoints 
    WHERE booking_offer_id = NEW.id AND status = 'pending';

    INSERT INTO public.booking_checkpoints (booking_offer_id, type, label, due_date) VALUES
      (NEW.id, 'subir_contrato', 'Subir contrato firmado', CURRENT_DATE + 3),
      (NEW.id, 'confirmar_equipo', 'Confirmar equipo técnico', v_event_date - 14),
      (NEW.id, 'solicitar_rider', 'Solicitar rider al promotor', v_event_date - 21),
      (NEW.id, 'enviar_logistica', 'Enviar info logística al promotor', v_event_date - 7);

    -- Add anticipo checkpoint if applicable
    IF COALESCE(NEW.anticipo_estado, 'pendiente') <> 'no_aplica' THEN
      INSERT INTO public.booking_checkpoints (booking_offer_id, type, label, due_date)
      VALUES (NEW.id, 'anticipo_esperado', 'Anticipo esperado', 
              COALESCE(NEW.anticipo_fecha_esperada, v_event_date - 30));
    END IF;
  END IF;

  -- On realizado
  IF NEW.phase = 'realizado' AND (OLD.phase IS NULL OR OLD.phase <> 'realizado') THEN
    INSERT INTO public.booking_checkpoints (booking_offer_id, type, label, due_date) VALUES
      (NEW.id, 'solicitar_factura', 'Solicitar factura al promotor', v_event_date + 1),
      (NEW.id, 'verificar_irpf', 'Verificar IRPF en factura', v_event_date + 3);

    IF COALESCE(NEW.liquidacion_estado, 'pendiente') <> 'no_aplica' 
       AND COALESCE(NEW.cobro_estado, 'pendiente') <> 'cobrado_completo' THEN
      INSERT INTO public.booking_checkpoints (booking_offer_id, type, label, due_date)
      VALUES (NEW.id, 'liquidacion_esperada', 'Liquidación esperada', 
              COALESCE(NEW.liquidacion_fecha_esperada, v_event_date + 7));
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_generate_booking_checkpoints
  AFTER UPDATE OF phase ON public.booking_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_booking_checkpoints();