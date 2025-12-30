-- Create table for availability audit history
CREATE TABLE public.booking_availability_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.booking_availability_requests(id) ON DELETE CASCADE,
  response_id UUID,
  booking_id UUID REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'request_created', 'response_added', 'status_changed', 'response_removed', 'block_toggled'
  actor_user_id UUID NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_availability_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view availability history"
ON public.booking_availability_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert availability history"
ON public.booking_availability_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_availability_history_booking ON public.booking_availability_history(booking_id);
CREATE INDEX idx_availability_history_request ON public.booking_availability_history(request_id);
CREATE INDEX idx_availability_history_created ON public.booking_availability_history(created_at DESC);