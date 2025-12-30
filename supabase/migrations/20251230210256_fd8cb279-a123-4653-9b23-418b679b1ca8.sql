-- Create booking_history table for complete event audit trail
CREATE TABLE public.booking_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'updated', 'status_change', 'phase_change', 'availability_change', etc.
  field_changed TEXT, -- The specific field that changed (null for creation)
  previous_value JSONB,
  new_value JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.booking_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view history
CREATE POLICY "Authenticated users can view booking history"
  ON public.booking_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert history
CREATE POLICY "Authenticated users can insert booking history"
  ON public.booking_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_booking_history_booking_id ON public.booking_history(booking_id);
CREATE INDEX idx_booking_history_changed_at ON public.booking_history(changed_at DESC);
CREATE INDEX idx_booking_history_event_type ON public.booking_history(event_type);

-- Create trigger function to auto-log booking changes
CREATE OR REPLACE FUNCTION public.log_booking_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_changes JSONB := '{}'::jsonb;
  v_field TEXT;
  v_old_val JSONB;
  v_new_val JSONB;
  v_event_type TEXT := 'updated';
  v_excluded_fields TEXT[] := ARRAY['updated_at', 'created_at'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log creation
    INSERT INTO public.booking_history (
      booking_id, event_type, new_value, changed_by, metadata
    ) VALUES (
      NEW.id,
      'created',
      to_jsonb(NEW),
      COALESCE(auth.uid(), NEW.created_by),
      jsonb_build_object('festival_ciclo', NEW.festival_ciclo, 'venue', NEW.venue)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Detect specific change types
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO public.booking_history (
        booking_id, event_type, field_changed, previous_value, new_value, changed_by
      ) VALUES (
        NEW.id,
        'status_change',
        'estado',
        to_jsonb(OLD.estado),
        to_jsonb(NEW.estado),
        COALESCE(auth.uid(), NEW.created_by)
      );
    END IF;

    IF OLD.phase IS DISTINCT FROM NEW.phase THEN
      INSERT INTO public.booking_history (
        booking_id, event_type, field_changed, previous_value, new_value, changed_by
      ) VALUES (
        NEW.id,
        'phase_change',
        'phase',
        to_jsonb(OLD.phase),
        to_jsonb(NEW.phase),
        COALESCE(auth.uid(), NEW.created_by)
      );
    END IF;

    -- Log other field changes
    FOR v_field IN 
      SELECT key FROM jsonb_each(to_jsonb(NEW)) 
      WHERE key NOT IN ('id', 'created_at', 'updated_at', 'estado', 'phase', 'created_by')
    LOOP
      v_old_val := to_jsonb(OLD) -> v_field;
      v_new_val := to_jsonb(NEW) -> v_field;
      
      IF v_old_val IS DISTINCT FROM v_new_val THEN
        v_changes := v_changes || jsonb_build_object(
          v_field, jsonb_build_object('old', v_old_val, 'new', v_new_val)
        );
      END IF;
    END LOOP;

    -- If there are other changes besides status/phase, log them
    IF v_changes <> '{}'::jsonb THEN
      INSERT INTO public.booking_history (
        booking_id, event_type, previous_value, new_value, changed_by, metadata
      ) VALUES (
        NEW.id,
        'updated',
        jsonb_build_object('changes', v_changes),
        NULL,
        COALESCE(auth.uid(), NEW.created_by),
        v_changes
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trg_log_booking_history
  AFTER INSERT OR UPDATE ON public.booking_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_history();