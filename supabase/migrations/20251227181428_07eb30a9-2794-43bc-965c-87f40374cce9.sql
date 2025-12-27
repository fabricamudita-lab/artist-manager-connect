-- Fix the on_booking_confirmed trigger to handle cases without valid artist_id for budgets
CREATE OR REPLACE FUNCTION public.on_booking_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_folder_id UUID;
  v_budget_id UUID;
  v_event_name TEXT;
  v_profile_id UUID;
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
      BEGIN
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
      EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail the whole trigger
        RAISE NOTICE 'Could not create folder: %', SQLERRM;
      END;
    END IF;
    
    -- Action 2: Create default budget for the event (only if we have a valid profile for artist_id)
    -- First check if the artist_id references a valid profile
    SELECT id INTO v_profile_id FROM public.profiles WHERE id = NEW.artist_id;
    
    IF v_profile_id IS NOT NULL THEN
      BEGIN
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
          'concierto',
          v_profile_id,
          NEW.fecha,
          NEW.hora,
          NEW.ciudad,
          COALESCE(NEW.lugar, NEW.venue),
          NEW.fee,
          COALESCE(NEW.created_by, auth.uid())
        )
        RETURNING id INTO v_budget_id;
        
        -- Action 3: Create income transaction for the fee
        IF NEW.fee IS NOT NULL AND NEW.fee > 0 AND v_budget_id IS NOT NULL THEN
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
            v_profile_id,
            NEW.id,
            v_budget_id,
            NEW.fee,
            'Fee de concierto: ' || v_event_name,
            'Conciertos',
            COALESCE(NEW.created_by, auth.uid())
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail the whole trigger
        RAISE NOTICE 'Could not create budget: %', SQLERRM;
      END;
    END IF;
    
    -- Action 4: Link folder to any associated project
    IF NEW.project_id IS NOT NULL AND v_folder_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.project_resources (project_id, node_id, linked_by)
        VALUES (NEW.project_id, v_folder_id, COALESCE(NEW.created_by, auth.uid()))
        ON CONFLICT (project_id, node_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not link project: %', SQLERRM;
      END;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;