-- Add commission percentage fields to budget_items
ALTER TABLE public.budget_items
ADD COLUMN IF NOT EXISTS is_commission_percentage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2) DEFAULT NULL;

COMMENT ON COLUMN public.budget_items.is_commission_percentage IS 'If true, the unit_price is calculated as a percentage of the budget fee';
COMMENT ON COLUMN public.budget_items.commission_percentage IS 'The percentage value when is_commission_percentage is true';