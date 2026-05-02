-- Indexes to speed up trigger lookups and budget filtering by booking/artist
CREATE INDEX IF NOT EXISTS idx_budgets_booking_offer_id ON public.budgets(booking_offer_id);
CREATE INDEX IF NOT EXISTS idx_budgets_artist_id ON public.budgets(artist_id);

-- Fix the negotiation trigger
CREATE OR REPLACE FUNCTION public.handle_booking_negotiation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_international boolean;
  v_existing_budget_id uuid;
  v_budget_status public.budget_status;
BEGIN
  -- Only act when entering 'negociacion' phase
  IF NEW.phase IS DISTINCT FROM 'negociacion' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.phase = 'negociacion' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_is_international := COALESCE(NEW.es_internacional, false);
    v_budget_status := CASE
      WHEN v_is_international THEN 'internacional'::public.budget_status
      ELSE 'nacional'::public.budget_status
    END;

    -- Avoid duplicating: prefer linking by booking_offer_id
    SELECT id INTO v_existing_budget_id
    FROM public.budgets
    WHERE booking_offer_id = NEW.id
    LIMIT 1;

    IF v_existing_budget_id IS NULL THEN
      INSERT INTO public.budgets (
        name,
        type,
        artist_id,
        booking_offer_id,
        event_date,
        city,
        venue,
        fee,
        formato,
        created_by,
        budget_status,
        status_negociacion,
        festival_ciclo,
        country
      ) VALUES (
        COALESCE(NULLIF(NEW.festival_ciclo, ''), NEW.venue, 'Booking ' || to_char(NEW.fecha, 'YYYY-MM-DD')),
        'concierto',
        NEW.artist_id,
        NEW.id,
        NEW.fecha,
        NEW.ciudad,
        NEW.venue,
        NEW.fee,
        NEW.formato,
        COALESCE(auth.uid(), NEW.created_by),
        v_budget_status,
        'borrador',
        NEW.festival_ciclo,
        NEW.pais
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never block booking save because of budget creation issues
    RAISE WARNING 'handle_booking_negotiation: failed to create budget for booking %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;