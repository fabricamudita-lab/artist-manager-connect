
-- Update on_booking_confirmed to use dynamic IRPF from artist fiscal profile
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
  v_default_template_id UUID;
  v_booking_product_id UUID;
  v_is_international BOOLEAN;
  v_booking_fee NUMERIC;
  v_artist_irpf NUMERIC;
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
    
    -- Get dynamic IRPF from artist fiscal profile
    SELECT CASE
      WHEN a.irpf_type = 'extranjero_ue' THEN 19
      WHEN a.irpf_type = 'extranjero_no_ue' THEN 24
      WHEN a.irpf_type = 'inicio_actividad' AND a.actividad_inicio > (now() - interval '2 years')::date THEN 7
      WHEN a.irpf_type = 'personalizado' THEN COALESCE(a.irpf_porcentaje, 15)
      ELSE 15
    END INTO v_artist_irpf
    FROM public.artists a WHERE a.id = NEW.artist_id;
    
    v_artist_irpf := COALESCE(v_artist_irpf, 15);
    
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
      
      -- Create budget with artist_id directly from booking
      INSERT INTO public.budgets (
        name, type, artist_id, event_date, event_time, city, venue, fee, formato, template_id, created_by
      )
      VALUES (
        'Presupuesto - ' || v_event_name,
        'concierto',
        NEW.artist_id,
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
      
      -- Insert crew members from the format as budget items (using dynamic IRPF)
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
          v_artist_irpf as irpf_percentage,
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
          'income', 'pending', NEW.artist_id, NEW.id, v_budget_id, NEW.fee,
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
