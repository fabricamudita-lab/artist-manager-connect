-- Fix the check_booking_can_confirm function to set search_path
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
$$ LANGUAGE plpgsql SET search_path = public;