-- Update the check_booking_can_confirm function to include availability check
CREATE OR REPLACE FUNCTION check_booking_can_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_has_conflicts boolean := false;
  v_block_confirmation boolean := false;
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
    
    -- Check availability conflicts
    SELECT 
      bar.block_confirmation,
      EXISTS (
        SELECT 1 FROM booking_availability_responses resp 
        WHERE resp.request_id = bar.id 
        AND resp.status = 'unavailable'
      )
    INTO v_block_confirmation, v_has_conflicts
    FROM booking_availability_requests bar
    WHERE bar.booking_id = NEW.id
    ORDER BY bar.created_at DESC
    LIMIT 1;
    
    IF v_block_confirmation AND v_has_conflicts THEN
      RAISE EXCEPTION 'No se puede confirmar: Hay conflictos de disponibilidad del equipo sin resolver';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;