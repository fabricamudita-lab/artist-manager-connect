-- 1. Add 'agrupada' value to billing_status enum
ALTER TYPE public.billing_status ADD VALUE IF NOT EXISTS 'agrupada';

-- 2. Add new columns to budget_items
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS supplier_invoice_number text,
  ADD COLUMN IF NOT EXISTS supplier_invoice_total numeric,
  ADD COLUMN IF NOT EXISTS invoice_group_parent_id uuid
      REFERENCES public.budget_items(id) ON DELETE SET NULL;

-- 3. Index for fast lookups of existing supplier invoices in a budget
CREATE INDEX IF NOT EXISTS idx_budget_items_invoice_group
  ON public.budget_items (budget_id, contact_id, supplier_invoice_number);

CREATE INDEX IF NOT EXISTS idx_budget_items_invoice_parent
  ON public.budget_items (invoice_group_parent_id);

-- 4. Trigger: prevent chained grouping (a child cannot itself be a parent)
CREATE OR REPLACE FUNCTION public.validate_invoice_group_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_has_parent uuid;
BEGIN
  IF NEW.invoice_group_parent_id IS NOT NULL THEN
    -- Self-reference forbidden
    IF NEW.invoice_group_parent_id = NEW.id THEN
      RAISE EXCEPTION 'A budget item cannot be grouped under itself';
    END IF;

    -- Parent cannot itself be a child
    SELECT invoice_group_parent_id INTO v_parent_has_parent
    FROM public.budget_items
    WHERE id = NEW.invoice_group_parent_id;

    IF v_parent_has_parent IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot group under a line that is itself grouped (no chained invoices)';
    END IF;

    -- A line that is itself a parent (has children) cannot become a child
    IF EXISTS (
      SELECT 1 FROM public.budget_items
      WHERE invoice_group_parent_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot group a line that already has children grouped under it';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invoice_group_parent ON public.budget_items;
CREATE TRIGGER trg_validate_invoice_group_parent
BEFORE INSERT OR UPDATE OF invoice_group_parent_id ON public.budget_items
FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_group_parent();

-- 5. Trigger: when parent line changes billing_status or invoice_link,
--    propagate to all grouped children.
CREATE OR REPLACE FUNCTION public.sync_grouped_invoice_children()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run if this row is a "parent" (no parent itself) and relevant fields changed
  IF NEW.invoice_group_parent_id IS NULL AND (
    OLD.billing_status IS DISTINCT FROM NEW.billing_status
    OR OLD.invoice_link IS DISTINCT FROM NEW.invoice_link
    OR OLD.supplier_invoice_number IS DISTINCT FROM NEW.supplier_invoice_number
  ) THEN
    UPDATE public.budget_items
    SET
      billing_status = CASE
        WHEN NEW.billing_status IN ('pagada', 'factura_recibida', 'factura_solicitada')
          THEN NEW.billing_status
        ELSE billing_status
      END,
      invoice_link = NEW.invoice_link,
      supplier_invoice_number = NEW.supplier_invoice_number
    WHERE invoice_group_parent_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_grouped_invoice_children ON public.budget_items;
CREATE TRIGGER trg_sync_grouped_invoice_children
AFTER UPDATE ON public.budget_items
FOR EACH ROW EXECUTE FUNCTION public.sync_grouped_invoice_children();

COMMENT ON COLUMN public.budget_items.supplier_invoice_number IS 'Número de factura del proveedor (ej. 2026/A-117). Identifica facturas multi-línea.';
COMMENT ON COLUMN public.budget_items.supplier_invoice_total IS 'Importe total bruto del documento de factura, para conciliar con la suma de líneas agrupadas.';
COMMENT ON COLUMN public.budget_items.invoice_group_parent_id IS 'Si está presente, esta línea está agrupada en la factura de la línea referenciada. La línea padre conserva el adjunto y el número de factura.';
