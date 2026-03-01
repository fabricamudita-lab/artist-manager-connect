
-- Table was partially created in previous migration, recreate cleanly
CREATE TABLE IF NOT EXISTS public.booking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_offer_id UUID NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_notifications_offer_type_unique UNIQUE (booking_offer_id, type)
);

CREATE INDEX IF NOT EXISTS idx_booking_notifications_offer ON public.booking_notifications(booking_offer_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_unread ON public.booking_notifications(read) WHERE read = false;

ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read booking_notifications"
  ON public.booking_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update booking_notifications"
  ON public.booking_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can insert booking_notifications"
  ON public.booking_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Anon can insert booking_notifications"
  ON public.booking_notifications FOR INSERT
  TO anon
  WITH CHECK (true);
