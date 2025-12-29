-- Add viability approval fields to booking_offers
ALTER TABLE public.booking_offers
ADD COLUMN IF NOT EXISTS viability_manager_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS viability_manager_by uuid,
ADD COLUMN IF NOT EXISTS viability_manager_at timestamptz,
ADD COLUMN IF NOT EXISTS viability_tour_manager_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS viability_tour_manager_by uuid,
ADD COLUMN IF NOT EXISTS viability_tour_manager_at timestamptz,
ADD COLUMN IF NOT EXISTS viability_production_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS viability_production_by uuid,
ADD COLUMN IF NOT EXISTS viability_production_at timestamptz,
ADD COLUMN IF NOT EXISTS viability_notes text;

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_booking_confirmed ON booking_offers;
DROP FUNCTION IF EXISTS handle_booking_confirmed();

-- Create new trigger function for negociación phase (creates folder + budget)
CREATE OR REPLACE FUNCTION handle_booking_negotiation()
RETURNS TRIGGER AS $$
DECLARE
  v_folder_id uuid;
  v_budget_id uuid;
  v_artist_name text;
  v_event_label text;
  v_year text;
  v_booking_product_id uuid;
  v_is_international boolean;
  v_crew_record RECORD;
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

    -- Create folder in storage_nodes
    INSERT INTO storage_nodes (
      artist_id,
      booking_id,
      node_type,
      name,
      parent_path,
      created_by
    ) VALUES (
      NEW.artist_id,
      NEW.id,
      'folder',
      v_event_label,
      'Conciertos/' || v_year,
      NEW.created_by
    )
    RETURNING id INTO v_folder_id;

    -- Update booking with folder reference
    NEW.folder_url := v_folder_id::text;

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
      CASE WHEN v_is_international THEN 'internacional'::budget_type ELSE 'nacional'::budget_type END,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for negociación phase
CREATE TRIGGER on_booking_negotiation
  BEFORE UPDATE ON booking_offers
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_negotiation();

-- Also handle INSERT for new bookings directly in negociación
CREATE OR REPLACE FUNCTION handle_booking_negotiation_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phase = 'negociacion' THEN
    -- Call the same logic by forcing an update-like behavior
    PERFORM handle_booking_negotiation();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if booking can be confirmed (all 3 viability checks passed)
CREATE OR REPLACE FUNCTION check_booking_can_confirm()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when trying to move to confirmado
  IF NEW.phase = 'confirmado' AND (OLD.phase IS NULL OR OLD.phase != 'confirmado') THEN
    -- Check all 3 viability approvals
    IF NOT COALESCE(NEW.viability_manager_approved, false) THEN
      RAISE EXCEPTION 'No se puede confirmar: Falta aprobación del Manager';
    END IF;
    IF NOT COALESCE(NEW.viability_tour_manager_approved, false) THEN
      RAISE EXCEPTION 'No se puede confirmar: Falta aprobación del Tour Manager';
    END IF;
    IF NOT COALESCE(NEW.viability_production_approved, false) THEN
      RAISE EXCEPTION 'No se puede confirmar: Falta aprobación de Producción';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce viability checks before confirmation
CREATE TRIGGER check_viability_before_confirm
  BEFORE UPDATE ON booking_offers
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_can_confirm();