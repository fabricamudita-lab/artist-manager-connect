-- Add percentage-based commission fields to booking_product_crew
ALTER TABLE public.booking_product_crew
ADD COLUMN IF NOT EXISTS is_percentage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS percentage_national NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS percentage_international NUMERIC(5,2) DEFAULT NULL;

COMMENT ON COLUMN public.booking_product_crew.is_percentage IS 'If true, use percentage fields instead of fixed fee fields';
COMMENT ON COLUMN public.booking_product_crew.percentage_national IS 'Percentage of booking fee for national concerts';
COMMENT ON COLUMN public.booking_product_crew.percentage_international IS 'Percentage of booking fee for international concerts';

-- Update on_booking_confirmed to handle percentage-based crew
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
  v_artist_profile_id UUID;
  v_default_template_id UUID;
  v_booking_product_id UUID;
  v_is_international BOOLEAN;
  v_booking_fee NUMERIC;
BEGIN
  -- Only trigger when status changes to 'confirmado'
  IF NEW.estado = 'confirmado' AND (OLD.estado IS NULL OR OLD.estado <> 'confirmado') THEN
    
    -- Build event name
    v_event_name := COALESCE(
      NEW.festival_ciclo,
      NEW.ciudad || ' - ' || COALESCE(NEW.lugar, NEW.venue, 'TBD')
    );
    
    -- Check if international
    v_is_international := COALESCE(NEW.es_internacional, false);
    v_booking_fee := COALESCE(NEW.fee, 0);
    
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
        RAISE NOTICE 'Could not create folder: %', SQLERRM;
      END;
    END IF;
    
    -- Action 2: Create budget for the event
    IF NEW.artist_id IS NOT NULL THEN
      SELECT profile_id INTO v_artist_profile_id FROM public.artists WHERE id = NEW.artist_id;
    END IF;
    
    BEGIN
      -- Try to find a default template
      SELECT id INTO v_default_template_id 
      FROM public.budget_templates 
      ORDER BY created_at ASC 
      LIMIT 1;
      
      -- Find the booking product (format)
      IF NEW.formato IS NOT NULL AND NEW.artist_id IS NOT NULL THEN
        SELECT bp.id INTO v_booking_product_id
        FROM public.booking_products bp
        WHERE bp.artist_id = NEW.artist_id
          AND bp.name = NEW.formato
          AND bp.is_active = true
        ORDER BY bp.created_at DESC
        LIMIT 1;
      END IF;
      
      INSERT INTO public.budgets (
        name, type, artist_id, event_date, event_time, city, venue, fee, formato, template_id, created_by
      )
      VALUES (
        'Presupuesto - ' || v_event_name,
        'concierto',
        v_artist_profile_id,
        NEW.fecha,
        NEW.hora,
        NEW.ciudad,
        COALESCE(NEW.lugar, NEW.venue),
        NEW.fee,
        NEW.formato,
        v_default_template_id,
        COALESCE(NEW.created_by, auth.uid())
      )
      RETURNING id INTO v_budget_id;
      
      -- Copy items from template if available
      IF v_default_template_id IS NOT NULL AND v_budget_id IS NOT NULL THEN
        INSERT INTO public.budget_items (
          budget_id, category, name, quantity, unit_price, iva_percentage, subcategory, observations, is_attendee
        )
        SELECT 
          v_budget_id, bti.category, bti.name, bti.quantity, bti.unit_price, bti.iva_percentage, bti.subcategory, bti.observations, bti.is_attendee
        FROM public.budget_template_items bti
        WHERE bti.template_id = v_default_template_id;
      END IF;
      
      -- Insert crew members from the format as budget items
      IF v_booking_product_id IS NOT NULL AND v_budget_id IS NOT NULL THEN
        INSERT INTO public.budget_items (
          budget_id, category, name, quantity, unit_price, iva_percentage, irpf_percentage, subcategory, is_attendee, observations
        )
        SELECT 
          v_budget_id,
          'Músicos / Crew' as category,
          COALESCE(
            bpc.role_label,
            (SELECT COALESCE(p.stage_name, p.full_name) FROM public.profiles p WHERE p.user_id::text = bpc.member_id),
            (SELECT COALESCE(c.stage_name, c.name) FROM public.contacts c WHERE c.id::text = bpc.member_id),
            'Miembro del equipo'
          ) as name,
          1 as quantity,
          -- Calculate price: if percentage, calculate from fee; otherwise use fixed fee
          CASE 
            WHEN COALESCE(bpc.is_percentage, false) THEN
              CASE 
                WHEN v_is_international THEN v_booking_fee * COALESCE(bpc.percentage_international, bpc.percentage_national, 0) / 100
                ELSE v_booking_fee * COALESCE(bpc.percentage_national, bpc.percentage_international, 0) / 100
              END
            ELSE
              CASE 
                WHEN v_is_international THEN COALESCE(bpc.fee_international, bpc.fee_national, 0)
                ELSE COALESCE(bpc.fee_national, bpc.fee_international, 0)
              END
          END as unit_price,
          0 as iva_percentage,
          15 as irpf_percentage,
          'Formato: ' || NEW.formato || CASE 
            WHEN COALESCE(bpc.is_percentage, false) THEN 
              ' (' || CASE WHEN v_is_international THEN COALESCE(bpc.percentage_international, bpc.percentage_national) ELSE COALESCE(bpc.percentage_national, bpc.percentage_international) END || '% del fee)'
            ELSE '' 
          END as subcategory,
          true as is_attendee,
          'Auto-generado desde formato' as observations
        FROM public.booking_product_crew bpc
        WHERE bpc.booking_product_id = v_booking_product_id;
      END IF;
      
      -- Action 3: Create income transaction for the fee
      IF NEW.fee IS NOT NULL AND NEW.fee > 0 AND v_budget_id IS NOT NULL THEN
        INSERT INTO public.transactions (
          transaction_type, status, artist_id, booking_id, budget_id, amount, description, category, created_by
        )
        VALUES (
          'income', 'pending', v_artist_profile_id, NEW.id, v_budget_id, NEW.fee,
          'Fee de concierto: ' || v_event_name, 'Conciertos', COALESCE(NEW.created_by, auth.uid())
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create budget: %', SQLERRM;
    END;
    
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