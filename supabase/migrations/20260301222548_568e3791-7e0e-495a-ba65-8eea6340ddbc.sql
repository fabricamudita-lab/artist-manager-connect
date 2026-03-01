
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS booking_offer_id UUID REFERENCES public.booking_offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_budgets_booking_offer_id ON public.budgets(booking_offer_id);
