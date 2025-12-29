-- Update the check_booking_can_confirm function to include booking name in error message
CREATE OR REPLACE FUNCTION check_booking_can_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_has_conflicts boolean := false;
  v_block_confirmation boolean := false;
  v_request_id uuid;
  v_booking_name text;
  v_artist_name text;
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
    
    -- Get booking name and artist name
    SELECT 
      COALESCE(bo.festival_ciclo, bo.lugar, 'Sin nombre'),
      COALESCE(a.name, '')
    INTO v_booking_name, v_artist_name
    FROM booking_offers bo
    LEFT JOIN artists a ON bo.artist_id = a.id
    WHERE bo.id = NEW.id;
    
    -- Check availability conflicts
    SELECT 
      bar.id,
      bar.block_confirmation,
      EXISTS (
        SELECT 1 FROM booking_availability_responses resp 
        WHERE resp.request_id = bar.id 
        AND resp.status = 'unavailable'
      )
    INTO v_request_id, v_block_confirmation, v_has_conflicts
    FROM booking_availability_requests bar
    WHERE bar.booking_id = NEW.id
    ORDER BY bar.created_at DESC
    LIMIT 1;
    
    IF v_block_confirmation AND v_has_conflicts THEN
      RAISE EXCEPTION 'AVAILABILITY_CONFLICT|%|%|%|%', v_request_id, v_booking_name, v_artist_name, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;