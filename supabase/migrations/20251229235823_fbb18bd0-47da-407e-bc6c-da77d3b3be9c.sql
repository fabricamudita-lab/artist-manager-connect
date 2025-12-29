-- Fix budget_type value in handle_booking_negotiation (use 'concierto') and align folder_url format
CREATE OR REPLACE FUNCTION public.handle_booking_negotiation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_folder_id uuid;
  v_budget_id uuid;
  v_artist_name text;
  v_event_label text;
  v_year text;
  v_booking_product_id uuid;
  v_is_international boolean;
  v_crew_record RECORD;
  v_conciertos_id uuid;
  v_year_folder_id uuid;
BEGIN
  -- Only trigger when phase changes to 'negociacion'
  IF NEW.phase = 'negociacion' AND (OLD.phase IS NULL OR OLD.phase != 'negociacion') THEN
    
    -- Check if folder already exists
    IF NEW.folder_url IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Get artist name
    SELECT COALESCE(stage_name, name) INTO v_artist_name
    FROM artists WHERE id = NEW.artist_id;

    -- Build event label
    v_event_label := COALESCE(TO_CHAR(NEW.fecha, 'YYMMDD'), 'SinFecha') || ' ' || 
                     COALESCE(NEW.ciudad, 'Ciudad') || ' ' ||
                     COALESCE(v_artist_name, 'Artista');
    
    v_year := COALESCE(EXTRACT(YEAR FROM NEW.fecha)::text, EXTRACT(YEAR FROM CURRENT_DATE)::text);

    -- Get or create Conciertos folder
    SELECT id INTO v_conciertos_id 
    FROM storage_nodes 
    WHERE artist_id = NEW.artist_id AND name = 'Conciertos' AND parent_id IS NULL;

    IF v_conciertos_id IS NULL THEN
      INSERT INTO storage_nodes (artist_id, name, node_type, is_system_folder, created_by)
      VALUES (NEW.artist_id, 'Conciertos', 'folder', true, NEW.created_by)
      RETURNING id INTO v_conciertos_id;
    END IF;

    -- Get or create year folder
    SELECT id INTO v_year_folder_id 
    FROM storage_nodes 
    WHERE artist_id = NEW.artist_id AND parent_id = v_conciertos_id AND name = v_year;

    IF v_year_folder_id IS NULL THEN
      INSERT INTO storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
      VALUES (NEW.artist_id, v_conciertos_id, v_year, 'folder', true, NEW.created_by)
      RETURNING id INTO v_year_folder_id;
    END IF;

    -- Create folder in storage_nodes with booking_id in metadata
    INSERT INTO storage_nodes (
      artist_id,
      parent_id,
      node_type,
      name,
      metadata,
      created_by
    ) VALUES (
      NEW.artist_id,
      v_year_folder_id,
      'folder',
      v_event_label,
      jsonb_build_object('booking_id', NEW.id),
      NEW.created_by
    )
    RETURNING id INTO v_folder_id;

    -- Update booking with folder reference (keep same URL format as other flows)
    NEW.folder_url := '/carpetas?folder=' || v_folder_id::text;

    -- Determine if international
    v_is_international := COALESCE(NEW.es_internacional, false);
    IF NEW.pais IS NOT NULL AND LOWER(NEW.pais) NOT IN ('españa', 'espana', 'spain', 'es') THEN
      v_is_international := true;
    END IF;

    -- Create budget for this booking
    INSERT INTO budgets (
      name,
      type,
      artist_id,
      city,
      country,
      venue,
      event_date,
      event_time,
      fee,
      formato,
      festival_ciclo,
      condiciones,
      budget_status,
      show_status,
      created_by
    ) VALUES (
      v_event_label,
      'concierto'::budget_type,
      NEW.artist_id,
      NEW.ciudad,
      NEW.pais,
      NEW.venue,
      NEW.fecha,
      NEW.hora,
      NEW.fee,
      NEW.formato,
      NEW.festival_ciclo,
      NEW.condiciones,
      CASE WHEN v_is_international THEN 'internacional'::budget_status ELSE 'nacional'::budget_status END,
      'pendiente'::show_status,
      NEW.created_by
    )
    RETURNING id INTO v_budget_id;

    -- Find matching booking product by formato
    IF NEW.formato IS NOT NULL AND NEW.artist_id IS NOT NULL THEN
      SELECT id INTO v_booking_product_id
      FROM booking_products
      WHERE artist_id = NEW.artist_id
        AND LOWER(name) = LOWER(NEW.formato)
        AND is_active = true
      LIMIT 1;

      -- Add crew members as budget items
      IF v_booking_product_id IS NOT NULL THEN
        FOR v_crew_record IN 
          SELECT 
            bpc.*,
            CASE 
              WHEN bpc.member_type = 'contact' THEN c.name
              WHEN bpc.member_type = 'team_member' THEN tm.name
              ELSE 'Miembro'
            END as member_name
          FROM booking_product_crew bpc
          LEFT JOIN contacts c ON bpc.member_type = 'contact' AND bpc.member_id::uuid = c.id
          LEFT JOIN team_members tm ON bpc.member_type = 'team_member' AND bpc.member_id::uuid = tm.id
          WHERE bpc.booking_product_id = v_booking_product_id
        LOOP
          INSERT INTO budget_items (
            budget_id,
            category,
            name,
            quantity,
            unit_price,
            contact_id,
            observations
          ) VALUES (
            v_budget_id,
            'Músicos / Crew',
            COALESCE(v_crew_record.role_label, v_crew_record.member_name, 'Miembro'),
            1,
            CASE 
              WHEN v_crew_record.is_percentage THEN
                CASE WHEN v_is_international 
                  THEN COALESCE(NEW.fee, 0) * COALESCE(v_crew_record.percentage_international, 0) / 100
                  ELSE COALESCE(NEW.fee, 0) * COALESCE(v_crew_record.percentage_national, 0) / 100
                END
              ELSE
                CASE WHEN v_is_international 
                  THEN COALESCE(v_crew_record.fee_international, 0)
                  ELSE COALESCE(v_crew_record.fee_national, 0)
                END
            END,
            CASE WHEN v_crew_record.member_type = 'contact' THEN v_crew_record.member_id::uuid ELSE NULL END,
            v_crew_record.member_name
          );
        END LOOP;
      END IF;
    END IF;

    -- Create income transaction for the fee
    IF NEW.fee IS NOT NULL AND NEW.fee > 0 THEN
      INSERT INTO transactions (
        transaction_type,
        amount,
        description,
        category,
        artist_id,
        booking_id,
        budget_id,
        status,
        created_by
      ) VALUES (
        'income',
        NEW.fee,
        'Fee concierto: ' || v_event_label,
        'Conciertos',
        NEW.artist_id,
        NEW.id,
        v_budget_id,
        'pending',
        NEW.created_by
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;