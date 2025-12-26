-- =============================================================
-- FIX: Remove SECURITY DEFINER from view and make it secure
-- =============================================================

-- Drop and recreate view without security definer (views default to security invoker)
DROP VIEW IF EXISTS public.profit_and_loss;

CREATE VIEW public.profit_and_loss
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  t.artist_id,
  t.project_id,
  t.booking_id,
  DATE_TRUNC('month', t.created_at) as period,
  SUM(CASE WHEN t.transaction_type = 'income' THEN t.net_amount ELSE 0 END) as total_income,
  SUM(CASE WHEN t.transaction_type = 'expense' THEN t.net_amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.transaction_type = 'income' THEN t.net_amount ELSE -t.net_amount END) as net_profit,
  COUNT(*) as transaction_count
FROM public.transactions t
WHERE t.status IN ('confirmed', 'invoiced', 'paid')
GROUP BY t.artist_id, t.project_id, t.booking_id, DATE_TRUNC('month', t.created_at);

-- =============================================================
-- ARCHITECTURAL REFACTOR: PHASE 4 - BOOKING TRIGGERS
-- =============================================================

-- 1. Function to handle booking confirmation automation
CREATE OR REPLACE FUNCTION public.on_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id UUID;
  v_budget_id UUID;
  v_event_name TEXT;
BEGIN
  -- Only trigger when status changes to 'confirmado'
  IF NEW.estado = 'confirmado' AND (OLD.estado IS NULL OR OLD.estado <> 'confirmado') THEN
    
    -- Build event name
    v_event_name := COALESCE(
      NEW.festival_ciclo,
      NEW.ciudad || ' - ' || COALESCE(NEW.lugar, NEW.venue, 'TBD')
    );
    
    -- Action 1: Create folder in storage_nodes under Conciertos > Year > Event
    IF NEW.artist_id IS NOT NULL AND NEW.fecha IS NOT NULL THEN
      v_folder_id := public.create_booking_event_folder(
        NEW.id,
        NEW.artist_id,
        v_event_name,
        NEW.fecha,
        COALESCE(NEW.created_by, auth.uid())
      );
      
      -- Update booking with folder reference
      UPDATE public.booking_offers
      SET folder_url = '/carpetas?folder=' || v_folder_id::TEXT
      WHERE id = NEW.id;
    END IF;
    
    -- Action 2: Create default budget for the event
    INSERT INTO public.budgets (
      name,
      type,
      artist_id,
      event_date,
      event_time,
      city,
      venue,
      fee,
      created_by
    )
    VALUES (
      'Presupuesto - ' || v_event_name,
      'evento',
      NEW.artist_id,
      NEW.fecha,
      NEW.hora,
      NEW.ciudad,
      COALESCE(NEW.lugar, NEW.venue),
      NEW.fee,
      COALESCE(NEW.created_by, auth.uid())
    )
    RETURNING id INTO v_budget_id;
    
    -- Action 3: Create income transaction for the fee
    IF NEW.fee IS NOT NULL AND NEW.fee > 0 THEN
      INSERT INTO public.transactions (
        transaction_type,
        status,
        artist_id,
        booking_id,
        budget_id,
        amount,
        description,
        category,
        created_by
      )
      VALUES (
        'income',
        'pending',
        NEW.artist_id,
        NEW.id,
        v_budget_id,
        NEW.fee,
        'Fee de concierto: ' || v_event_name,
        'Conciertos',
        COALESCE(NEW.created_by, auth.uid())
      );
    END IF;
    
    -- Action 4: Link folder to any associated project
    IF NEW.project_id IS NOT NULL AND v_folder_id IS NOT NULL THEN
      INSERT INTO public.project_resources (project_id, node_id, linked_by)
      VALUES (NEW.project_id, v_folder_id, COALESCE(NEW.created_by, auth.uid()))
      ON CONFLICT (project_id, node_id) DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create trigger on booking_offers
DROP TRIGGER IF EXISTS booking_confirmation_trigger ON public.booking_offers;
CREATE TRIGGER booking_confirmation_trigger
AFTER INSERT OR UPDATE ON public.booking_offers
FOR EACH ROW
EXECUTE FUNCTION public.on_booking_confirmed();

-- 3. Function to create income transaction when fee is updated
CREATE OR REPLACE FUNCTION public.sync_booking_fee_to_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Only sync if booking is confirmed and fee changed
  IF NEW.estado = 'confirmado' AND NEW.fee IS DISTINCT FROM OLD.fee THEN
    
    -- Find existing transaction
    SELECT id INTO v_transaction_id
    FROM public.transactions
    WHERE booking_id = NEW.id AND category = 'Conciertos' AND transaction_type = 'income';
    
    IF v_transaction_id IS NOT NULL THEN
      -- Update existing transaction
      UPDATE public.transactions
      SET amount = NEW.fee, updated_at = now()
      WHERE id = v_transaction_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_fee_sync_trigger
AFTER UPDATE ON public.booking_offers
FOR EACH ROW
EXECUTE FUNCTION public.sync_booking_fee_to_transaction();

-- 4. Trigger to auto-create artist default folders when artist is created
CREATE OR REPLACE FUNCTION public.on_artist_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create default folder structure for new artist
  PERFORM public.create_default_artist_folders(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS artist_default_folders_trigger ON public.artists;
CREATE TRIGGER artist_default_folders_trigger
AFTER INSERT ON public.artists
FOR EACH ROW
EXECUTE FUNCTION public.on_artist_created();