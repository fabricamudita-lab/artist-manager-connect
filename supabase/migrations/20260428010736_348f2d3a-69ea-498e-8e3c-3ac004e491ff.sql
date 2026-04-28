
-- 1. Replace commission trigger function: only auto-suggest on INSERT when both fields are NULL
CREATE OR REPLACE FUNCTION public.calculate_booking_commission()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only auto-populate on INSERT when no value provided. Respect 0 and any explicit value.
  IF TG_OP = 'INSERT'
     AND NEW.comision_porcentaje IS NULL
     AND NEW.comision_euros IS NULL THEN
    IF NEW.es_cityzen THEN
      NEW.comision_porcentaje := 10.0;
    ELSE
      NEW.comision_porcentaje := 5.0;
    END IF;
    IF NEW.fee IS NOT NULL THEN
      NEW.comision_euros := (NEW.fee * NEW.comision_porcentaje) / 100;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Recreate trigger only on INSERT (was BEFORE INSERT OR UPDATE)
DROP TRIGGER IF EXISTS trg_calculate_booking_commission ON public.booking_offers;
CREATE TRIGGER trg_calculate_booking_commission
BEFORE INSERT ON public.booking_offers
FOR EACH ROW
EXECUTE FUNCTION public.calculate_booking_commission();

-- 3. Add beneficiary + concept columns to booking_offers
ALTER TABLE public.booking_offers
  ADD COLUMN IF NOT EXISTS comision_beneficiario_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comision_beneficiario_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comision_concepto text;

-- 4. Mutual-exclusion constraint: at most one of the two beneficiary IDs
ALTER TABLE public.booking_offers
  DROP CONSTRAINT IF EXISTS booking_offers_comision_beneficiario_xor;
ALTER TABLE public.booking_offers
  ADD CONSTRAINT booking_offers_comision_beneficiario_xor
  CHECK (comision_beneficiario_profile_id IS NULL OR comision_beneficiario_contact_id IS NULL);

-- 5. Indexes for lookup by beneficiary
CREATE INDEX IF NOT EXISTS idx_booking_offers_comision_profile
  ON public.booking_offers (comision_beneficiario_profile_id)
  WHERE comision_beneficiario_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_offers_comision_contact
  ON public.booking_offers (comision_beneficiario_contact_id)
  WHERE comision_beneficiario_contact_id IS NOT NULL;
