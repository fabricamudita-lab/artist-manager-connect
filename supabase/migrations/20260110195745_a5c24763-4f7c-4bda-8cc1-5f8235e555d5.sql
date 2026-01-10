-- Corregir el trigger para usar categorías correctas y calcular porcentajes bien
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
  v_booking_fee numeric;
  v_crew_record RECORD;
  v_conciertos_id uuid;
  v_year_folder_id uuid;
  v_unit_price numeric;
  v_category text;
  v_member_name text;
  v_observations text;
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

    -- Create standard subfolders
    INSERT INTO storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
    VALUES 
      (NEW.artist_id, v_folder_id, 'Contratos', 'folder', true, NEW.created_by),
      (NEW.artist_id, v_folder_id, 'Facturas', 'folder', true, NEW.created_by),
      (NEW.artist_id, v_folder_id, 'Grafismos', 'folder', true, NEW.created_by),
      (NEW.artist_id, v_folder_id, 'Hojas de Ruta', 'folder', true, NEW.created_by),
      (NEW.artist_id, v_folder_id, 'Presupuesto', 'folder', true, NEW.created_by),
      (NEW.artist_id, v_folder_id, 'Rider', 'folder', true, NEW.created_by)
    ON CONFLICT DO NOTHING;

    -- Update booking with folder reference
    NEW.folder_url := '/carpetas?folder=' || v_folder_id::text;

    -- Determine if international
    v_is_international := COALESCE(NEW.es_internacional, false);
    IF NEW.pais IS NOT NULL AND LOWER(NEW.pais) NOT IN ('españa', 'espana', 'spain', 'es') THEN
      v_is_international := true;
    END IF;
    
    -- Get booking fee for percentage calculations
    v_booking_fee := COALESCE(NEW.fee, 0);

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
            c.name AS contact_name,
            c.stage_name AS contact_stage_name,
            c.category AS contact_category,
            c.id AS contact_id,
            a.name AS artist_name,
            a.stage_name AS artist_stage_name
          FROM booking_product_crew bpc
          LEFT JOIN contacts c ON c.id::text = bpc.member_id
          LEFT JOIN artists a ON a.id::text = bpc.member_id
          WHERE bpc.booking_product_id = v_booking_product_id
        LOOP
          -- Calculate unit price based on fee type and international status
          IF COALESCE(v_crew_record.is_percentage, false) THEN
            -- Percentage of fee
            IF v_is_international THEN
              v_unit_price := v_booking_fee * COALESCE(v_crew_record.percentage_international, v_crew_record.percentage_national, 0) / 100;
            ELSE
              v_unit_price := v_booking_fee * COALESCE(v_crew_record.percentage_national, v_crew_record.percentage_international, 0) / 100;
            END IF;
          ELSE
            -- Fixed fee
            IF v_is_international THEN
              v_unit_price := COALESCE(v_crew_record.fee_international, v_crew_record.fee_national, 0);
            ELSE
              v_unit_price := COALESCE(v_crew_record.fee_national, v_crew_record.fee_international, 0);
            END IF;
          END IF;
          
          -- Determine member name
          v_member_name := COALESCE(
            v_crew_record.role_label,
            v_crew_record.contact_stage_name,
            v_crew_record.contact_name,
            v_crew_record.artist_stage_name,
            v_crew_record.artist_name,
            'Miembro'
          );
          
          -- Determine category based on contact category or member type
          IF v_crew_record.member_type = 'workspace' OR v_crew_record.artist_name IS NOT NULL THEN
            v_category := 'Artista Principal';
          ELSIF v_crew_record.contact_category IS NOT NULL THEN
            -- Map contact category to budget category
            CASE v_crew_record.contact_category
              WHEN 'banda' THEN v_category := 'Músicos';
              WHEN 'artistico' THEN v_category := 'Músicos';
              WHEN 'tecnico' THEN v_category := 'Equipo técnico';
              WHEN 'management' THEN v_category := 'Management';
              WHEN 'booking' THEN v_category := 'Booking';
              WHEN 'tourmanager' THEN v_category := 'Transporte';
              WHEN 'produccion' THEN v_category := 'Equipo técnico';
              ELSE v_category := 'Músicos';
            END CASE;
          ELSE
            v_category := 'Músicos';
          END IF;
          
          -- Build observations
          v_observations := 'Formato: ' || COALESCE(NEW.formato, 'N/A') || 
            ' (' || CASE WHEN v_is_international THEN 'Internacional' ELSE 'Nacional' END || ')';
          
          IF COALESCE(v_crew_record.is_percentage, false) THEN
            v_observations := v_observations || ' - ' ||
              CASE WHEN v_is_international 
                THEN COALESCE(v_crew_record.percentage_international, v_crew_record.percentage_national)
                ELSE COALESCE(v_crew_record.percentage_national, v_crew_record.percentage_international)
              END || '% del fee';
          END IF;
          
          INSERT INTO budget_items (
            budget_id,
            category,
            name,
            quantity,
            unit_price,
            iva_percentage,
            irpf_percentage,
            is_attendee,
            contact_id,
            observations
          ) VALUES (
            v_budget_id,
            v_category,
            v_member_name,
            1,
            v_unit_price,
            0,
            15,
            true,
            v_crew_record.contact_id,
            v_observations
          );
        END LOOP;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;