-- Add new fields for the Kanban booking module
ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'lead' CHECK (phase IN ('lead', 'oferta_enviada', 'negociacion', 'confirmado', 'contratado', 'cerrado_perdido'));

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS promotor TEXT;

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS pais TEXT;

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS venue TEXT;

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2);

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS gastos_estimados DECIMAL(10,2);

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS comision_porcentaje DECIMAL(5,2) DEFAULT 5.0;

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS comision_euros DECIMAL(10,2);

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS es_cityzen BOOLEAN DEFAULT false;

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS es_internacional BOOLEAN DEFAULT false;

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS estado_facturacion TEXT DEFAULT 'pendiente' CHECK (estado_facturacion IN ('pendiente', 'facturado', 'pagado', 'vencido'));

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS adjuntos JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS notas TEXT;

ALTER TABLE public.booking_offers 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing offers with default phase
UPDATE public.booking_offers 
SET phase = CASE 
  WHEN estado = 'pendiente' THEN 'lead'
  WHEN estado = 'confirmado' THEN 'confirmado'
  ELSE 'lead'
END
WHERE phase IS NULL;

-- Create index for sorting within phases
CREATE INDEX IF NOT EXISTS idx_booking_offers_phase_sort ON public.booking_offers(phase, sort_order);

-- Add trigger to calculate commission in euros automatically
CREATE OR REPLACE FUNCTION calculate_booking_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate commission based on CityZen rules
  IF NEW.es_cityzen THEN
    NEW.comision_porcentaje := 10.0;
  ELSE
    NEW.comision_porcentaje := 5.0;
  END IF;
  
  -- Calculate commission in euros
  IF NEW.fee IS NOT NULL THEN
    NEW.comision_euros := (NEW.fee * NEW.comision_porcentaje) / 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_calculate_booking_commission
  BEFORE INSERT OR UPDATE ON public.booking_offers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_commission();