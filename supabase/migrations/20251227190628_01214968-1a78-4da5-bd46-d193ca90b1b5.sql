-- 1. Update create_booking_event_folder to add "Presupuesto" folder
CREATE OR REPLACE FUNCTION public.create_booking_event_folder(p_booking_id uuid, p_artist_id uuid, p_event_name text, p_event_date date, p_created_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year_folder_id UUID;
  v_event_folder_id UUID;
  v_year TEXT;
  v_conciertos_id UUID;
  v_folder_name TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM p_event_date)::TEXT;
  v_folder_name := TO_CHAR(p_event_date, 'YYYY.MM.DD') || ' ' || p_event_name;

  -- Get Conciertos folder
  SELECT id INTO v_conciertos_id 
  FROM public.storage_nodes 
  WHERE artist_id = p_artist_id AND name = 'Conciertos' AND parent_id IS NULL;

  -- Create Conciertos if doesn't exist
  IF v_conciertos_id IS NULL THEN
    INSERT INTO public.storage_nodes (artist_id, name, node_type, is_system_folder, created_by)
    VALUES (p_artist_id, 'Conciertos', 'folder', true, p_created_by)
    RETURNING id INTO v_conciertos_id;
  END IF;

  -- Get or create year folder
  SELECT id INTO v_year_folder_id 
  FROM public.storage_nodes 
  WHERE artist_id = p_artist_id AND parent_id = v_conciertos_id AND name = v_year;

  IF v_year_folder_id IS NULL THEN
    INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
    VALUES (p_artist_id, v_conciertos_id, v_year, 'folder', true, p_created_by)
    RETURNING id INTO v_year_folder_id;
  END IF;

  -- Create event folder with booking reference in metadata
  INSERT INTO public.storage_nodes (
    artist_id, parent_id, name, node_type, is_system_folder, 
    metadata, created_by
  )
  VALUES (
    p_artist_id, v_year_folder_id, v_folder_name, 'folder', false,
    jsonb_build_object('booking_id', p_booking_id, 'event_date', p_event_date),
    p_created_by
  )
  ON CONFLICT (artist_id, parent_id, name) DO UPDATE SET
    metadata = jsonb_build_object('booking_id', p_booking_id, 'event_date', p_event_date)
  RETURNING id INTO v_event_folder_id;

  -- Create sub-structures inside the event folder
  INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
  VALUES 
    (p_artist_id, v_event_folder_id, 'Facturas', 'folder', true, p_created_by),
    (p_artist_id, v_event_folder_id, 'Hojas de Ruta', 'folder', true, p_created_by),
    (p_artist_id, v_event_folder_id, 'Contratos', 'folder', true, p_created_by),
    (p_artist_id, v_event_folder_id, 'Rider', 'folder', true, p_created_by),
    (p_artist_id, v_event_folder_id, 'Grafismos', 'folder', true, p_created_by),
    (p_artist_id, v_event_folder_id, 'Presupuesto', 'folder', true, p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING;

  -- Link folder to any associated project
  INSERT INTO public.project_resources (project_id, node_id, linked_by)
  SELECT p.id, v_event_folder_id, p_created_by
  FROM public.booking_offers bo
  JOIN public.projects p ON p.id = bo.project_id
  WHERE bo.id = p_booking_id AND bo.project_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN v_event_folder_id;
END;
$function$;

-- 2. Update on_booking_confirmed to create budget with default items from template
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
  v_default_template_id UUID;
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
        RAISE NOTICE 'Could not create folder: %', SQLERRM;
      END;
    END IF;
    
    -- Action 2: Create budget for the event
    SELECT id INTO v_profile_id FROM public.profiles WHERE id = NEW.artist_id;
    
    IF v_profile_id IS NOT NULL THEN
      BEGIN
        -- Try to find a default template (first one available)
        SELECT id INTO v_default_template_id 
        FROM public.budget_templates 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        INSERT INTO public.budgets (
          name,
          type,
          artist_id,
          event_date,
          event_time,
          city,
          venue,
          fee,
          template_id,
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
          v_default_template_id,
          COALESCE(NEW.created_by, auth.uid())
        )
        RETURNING id INTO v_budget_id;
        
        -- Copy items from template if available
        IF v_default_template_id IS NOT NULL AND v_budget_id IS NOT NULL THEN
          INSERT INTO public.budget_items (
            budget_id,
            category,
            name,
            quantity,
            unit_price,
            iva_percentage,
            subcategory,
            observations,
            is_attendee
          )
          SELECT 
            v_budget_id,
            bti.category,
            bti.name,
            bti.quantity,
            bti.unit_price,
            bti.iva_percentage,
            bti.subcategory,
            bti.observations,
            bti.is_attendee
          FROM public.budget_template_items bti
          WHERE bti.template_id = v_default_template_id;
        END IF;
        
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

-- 3. Add "Presupuesto" folder to existing booking (2026.04.29 M00DITA)
INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
SELECT 
  artist_id,
  id,
  'Presupuesto',
  'folder',
  true,
  created_by
FROM public.storage_nodes
WHERE id = '31e51eb6-4004-455c-a1a9-6ef0c329e71e'
ON CONFLICT (artist_id, parent_id, name) DO NOTHING;