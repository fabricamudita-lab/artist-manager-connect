-- Extender booking_expenses para gestión completa de imprevistos
ALTER TABLE public.booking_expenses
  ADD COLUMN IF NOT EXISTS expense_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS irpf_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_tax_label TEXT,
  ADD COLUMN IF NOT EXISTS split_mode TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS split_promoter_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_agency_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_artist_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pushed_budget_item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL;

-- Restricción de modo de reparto
DO $$ BEGIN
  ALTER TABLE public.booking_expenses
    ADD CONSTRAINT booking_expenses_split_mode_chk
    CHECK (split_mode IN ('single','split'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Restricción de suma 100 en modo split
DO $$ BEGIN
  ALTER TABLE public.booking_expenses
    ADD CONSTRAINT booking_expenses_split_sum_chk
    CHECK (
      split_mode = 'single'
      OR (COALESCE(split_promoter_pct,0)
        + COALESCE(split_agency_pct,0)
        + COALESCE(split_artist_pct,0)) = 100
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill de fecha de gasto
UPDATE public.booking_expenses
SET expense_date = created_at::date
WHERE expense_date IS NULL;

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_booking_expenses_booking_id
  ON public.booking_expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_expenses_expense_date
  ON public.booking_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_booking_expenses_pushed_budget_item
  ON public.booking_expenses(pushed_budget_item_id);

-- Políticas de storage para el bucket "facturas" (lectura/subida autenticada)
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload facturas"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'facturas');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read facturas"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'facturas');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete own facturas"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'facturas' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;