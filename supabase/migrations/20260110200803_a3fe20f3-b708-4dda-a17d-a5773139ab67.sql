-- Actualizar el trigger para que guarde is_commission_percentage y commission_percentage
-- en lugar de calcular el precio fijo

CREATE OR REPLACE FUNCTION public.handle_booking_negotiation()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_id uuid;
  v_booking_fee numeric;
  v_is_international boolean;
  v_product_id uuid;
  v_product_name text;
  v_artist_name text;
  v_crew_record RECORD;
  v_category text;
  v_unit_price numeric;
  v_member_name text;
  v_observations text;
  v_percentage numeric;
  v_is_percentage boolean;
  v_contact_category text;
BEGIN
  -- Solo actuar cuando cambia el estado a 'negociacion'
  IF NEW.status_negociacion = 'negociacion' AND (OLD.status_negociacion IS NULL OR OLD.status_negociacion != 'negociacion') THEN
    
    -- Verificar si ya existe un presupuesto para este booking
    SELECT id INTO v_budget_id FROM budgets WHERE name ILIKE '%' || NEW.festival_ciclo || '%' AND artist_id = NEW.artist_id LIMIT 1;
    
    IF v_budget_id IS NULL THEN
      v_booking_fee := COALESCE(NEW.fee, 0);
      v_is_international := COALESCE(NEW.is_international, false);
      v_product_id := NEW.product_id;
      
      -- Obtener nombre del producto/formato
      SELECT name INTO v_product_name FROM booking_products WHERE id = v_product_id;
      
      -- Obtener nombre del artista
      SELECT name INTO v_artist_name FROM artists WHERE id = NEW.artist_id;
      
      -- Crear el presupuesto
      INSERT INTO budgets (
        name,
        artist_id,
        type,
        city,
        country,
        venue,
        event_date,
        fee,
        formato,
        budget_status,
        created_by
      ) VALUES (
        COALESCE(NEW.event_date::text, '') || ' ' || COALESCE(NEW.ciudad, '') || ' ' || COALESCE(NEW.festival_ciclo, ''),
        NEW.artist_id,
        'concierto',
        COALESCE(NEW.ciudad, ''),
        COALESCE(NEW.pais, 'España'),
        COALESCE(NEW.lugar, NEW.venue, ''),
        NEW.event_date,
        v_booking_fee,
        v_product_name,
        'borrador',
        NEW.created_by
      )
      RETURNING id INTO v_budget_id;
      
      -- Crear subcarpetas estándar del evento
      INSERT INTO artist_event_subfolders (event_id, name, subfolder_type, event_type, created_by)
      VALUES 
        (NEW.id, 'Contratos', 'contracts', 'booking', NEW.created_by),
        (NEW.id, 'Facturas', 'invoices', 'booking', NEW.created_by),
        (NEW.id, 'Riders', 'riders', 'booking', NEW.created_by),
        (NEW.id, 'Promoción', 'promo', 'booking', NEW.created_by),
        (NEW.id, 'Logística', 'logistics', 'booking', NEW.created_by),
        (NEW.id, 'Otros', 'other', 'booking', NEW.created_by)
      ON CONFLICT DO NOTHING;
      
      -- Insertar miembros del crew como budget_items
      IF v_product_id IS NOT NULL THEN
        FOR v_crew_record IN
          SELECT 
            bpc.member_id,
            bpc.member_type,
            bpc.role_label,
            bpc.fee_national,
            bpc.fee_international,
            bpc.is_percentage,
            bpc.percentage_national,
            bpc.percentage_international,
            c.name as contact_name,
            c.category as contact_category,
            c.id as contact_id
          FROM booking_product_crew bpc
          LEFT JOIN contacts c ON c.id = bpc.member_id::uuid AND bpc.member_type = 'contact'
          WHERE bpc.booking_product_id = v_product_id
        LOOP
          -- Determinar el nombre del miembro
          IF v_crew_record.member_type = 'workspace' THEN
            v_member_name := v_artist_name;
            v_contact_category := NULL;
          ELSIF v_crew_record.contact_name IS NOT NULL THEN
            v_member_name := v_crew_record.contact_name;
            v_contact_category := v_crew_record.contact_category;
          ELSE
            v_member_name := COALESCE(v_crew_record.role_label, 'Miembro');
            v_contact_category := NULL;
          END IF;
          
          -- Determinar si es porcentaje
          v_is_percentage := COALESCE(v_crew_record.is_percentage, false);
          
          -- Calcular unit_price y porcentaje
          IF v_is_percentage THEN
            -- Es porcentaje - guardar el porcentaje
            IF v_is_international THEN
              v_percentage := COALESCE(v_crew_record.percentage_international, v_crew_record.percentage_national, 0);
            ELSE
              v_percentage := COALESCE(v_crew_record.percentage_national, v_crew_record.percentage_international, 0);
            END IF;
            v_unit_price := v_booking_fee * v_percentage / 100;
          ELSE
            -- Tarifa fija
            v_percentage := NULL;
            IF v_is_international THEN
              v_unit_price := COALESCE(v_crew_record.fee_international, v_crew_record.fee_national, 0);
            ELSE
              v_unit_price := COALESCE(v_crew_record.fee_national, v_crew_record.fee_international, 0);
            END IF;
          END IF;
          
          -- Determinar categoría basada en contact_category o member_type
          IF v_crew_record.member_type = 'workspace' THEN
            v_category := 'Artista Principal';
          ELSIF v_contact_category IS NOT NULL THEN
            CASE v_contact_category
              WHEN 'banda' THEN v_category := 'Músicos';
              WHEN 'artistico' THEN v_category := 'Músicos';
              WHEN 'tecnico' THEN v_category := 'Equipo técnico';
              WHEN 'management' THEN v_category := 'Management';
              WHEN 'booking' THEN v_category := 'Booking';
              WHEN 'tourmanager' THEN v_category := 'Transporte';
              WHEN 'produccion' THEN v_category := 'Equipo técnico';
              WHEN 'compositor' THEN v_category := 'Músicos';
              WHEN 'letrista' THEN v_category := 'Músicos';
              WHEN 'productor' THEN v_category := 'Equipo técnico';
              WHEN 'interprete' THEN v_category := 'Músicos';
              WHEN 'sello' THEN v_category := 'Management';
              WHEN 'editorial' THEN v_category := 'Management';
              ELSE v_category := 'Músicos';
            END CASE;
          ELSE
            v_category := 'Músicos';
          END IF;
          
          -- Generar observations
          IF v_is_percentage THEN
            v_observations := 'Formato: ' || COALESCE(v_product_name, 'N/A') || 
              CASE WHEN v_is_international THEN ' (Internacional)' ELSE ' (Nacional)' END ||
              ' - ' || v_percentage::text || '% del fee';
          ELSE
            v_observations := 'Formato: ' || COALESCE(v_product_name, 'N/A') || 
              CASE WHEN v_is_international THEN ' (Internacional)' ELSE ' (Nacional)' END ||
              ' - Tarifa fija';
          END IF;
          
          -- Insertar budget item con is_commission_percentage y commission_percentage
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
            observations,
            is_commission_percentage,
            commission_percentage
          ) VALUES (
            v_budget_id,
            v_category,
            v_member_name,
            1,
            v_unit_price,
            0,
            15,
            true,
            CASE WHEN v_crew_record.member_type = 'contact' THEN v_crew_record.contact_id ELSE NULL END,
            v_observations,
            v_is_percentage,
            v_percentage
          );
        END LOOP;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;