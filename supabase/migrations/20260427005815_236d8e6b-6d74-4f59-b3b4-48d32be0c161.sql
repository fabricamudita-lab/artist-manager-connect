-- Soporte explícito de múltiples presupuestos por booking
-- 1. Nuevas columnas en budgets
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS is_primary_for_booking BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_role TEXT;

-- 2. Restricción de longitud para booking_role (defensa contra abuso/XSS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budgets_booking_role_length_chk'
  ) THEN
    ALTER TABLE public.budgets
      ADD CONSTRAINT budgets_booking_role_length_chk
      CHECK (booking_role IS NULL OR char_length(booking_role) <= 60);
  END IF;
END$$;

-- 3. Índice parcial único: como máximo un principal por booking
CREATE UNIQUE INDEX IF NOT EXISTS budgets_one_primary_per_booking
  ON public.budgets(booking_offer_id)
  WHERE is_primary_for_booking = true AND booking_offer_id IS NOT NULL;

-- 4. Índice compuesto para listar presupuestos de un booking ordenados
CREATE INDEX IF NOT EXISTS idx_budgets_booking_created
  ON public.budgets(booking_offer_id, created_at DESC)
  WHERE booking_offer_id IS NOT NULL;

-- 5. Trigger: gestión automática del flag is_primary_for_booking
CREATE OR REPLACE FUNCTION public.manage_budget_primary_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_primary uuid;
BEGIN
  -- Si se desvincula del booking, no puede ser principal
  IF NEW.booking_offer_id IS NULL THEN
    NEW.is_primary_for_booking := false;
    RETURN NEW;
  END IF;

  -- Si se marca como principal, desmarcar al anterior principal del mismo booking
  IF NEW.is_primary_for_booking = true THEN
    UPDATE public.budgets
       SET is_primary_for_booking = false
     WHERE booking_offer_id = NEW.booking_offer_id
       AND id <> NEW.id
       AND is_primary_for_booking = true;
    RETURN NEW;
  END IF;

  -- Si NO se marca como principal pero el booking aún no tiene principal, promocionar éste
  SELECT id INTO v_existing_primary
    FROM public.budgets
   WHERE booking_offer_id = NEW.booking_offer_id
     AND id <> NEW.id
     AND is_primary_for_booking = true
   LIMIT 1;

  IF v_existing_primary IS NULL THEN
    NEW.is_primary_for_booking := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manage_budget_primary_flag ON public.budgets;
CREATE TRIGGER trg_manage_budget_primary_flag
BEFORE INSERT OR UPDATE OF booking_offer_id, is_primary_for_booking
ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.manage_budget_primary_flag();

-- 6. Cuando se borra/desvincula el principal y existen otros, promocionar al más reciente
CREATE OR REPLACE FUNCTION public.promote_next_primary_budget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_booking uuid;
  v_was_primary boolean;
  v_next_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_booking := OLD.booking_offer_id;
    v_was_primary := OLD.is_primary_for_booking;
  ELSE
    v_old_booking := OLD.booking_offer_id;
    v_was_primary := OLD.is_primary_for_booking AND (
      NEW.booking_offer_id IS DISTINCT FROM OLD.booking_offer_id
      OR NEW.is_primary_for_booking = false
    );
  END IF;

  IF v_old_booking IS NOT NULL AND v_was_primary THEN
    SELECT id INTO v_next_id
      FROM public.budgets
     WHERE booking_offer_id = v_old_booking
       AND is_primary_for_booking = false
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_next_id IS NOT NULL THEN
      UPDATE public.budgets
         SET is_primary_for_booking = true
       WHERE id = v_next_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_next_primary_budget ON public.budgets;
CREATE TRIGGER trg_promote_next_primary_budget
AFTER UPDATE OF booking_offer_id, is_primary_for_booking OR DELETE
ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.promote_next_primary_budget();

-- 7. Backfill: marcar como principal el presupuesto más antiguo de cada booking que no tenga ninguno
WITH first_budget_per_booking AS (
  SELECT DISTINCT ON (booking_offer_id) id, booking_offer_id
    FROM public.budgets
   WHERE booking_offer_id IS NOT NULL
   ORDER BY booking_offer_id, created_at ASC
)
UPDATE public.budgets b
   SET is_primary_for_booking = true
  FROM first_budget_per_booking f
 WHERE b.id = f.id
   AND NOT EXISTS (
     SELECT 1 FROM public.budgets b2
      WHERE b2.booking_offer_id = b.booking_offer_id
        AND b2.is_primary_for_booking = true
   );