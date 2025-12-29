-- Create enum for availability response status
CREATE TYPE availability_response_status AS ENUM ('pending', 'available', 'unavailable', 'tentative');

-- Create enum for availability request status
CREATE TYPE availability_request_status AS ENUM ('open', 'closed', 'cancelled');

-- Create table for booking availability requests
CREATE TABLE public.booking_availability_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  status availability_request_status NOT NULL DEFAULT 'open',
  block_confirmation BOOLEAN NOT NULL DEFAULT true,
  deadline TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  share_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create table for individual team member responses
CREATE TABLE public.booking_availability_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.booking_availability_requests(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  responder_name TEXT,
  responder_email TEXT,
  status availability_response_status NOT NULL DEFAULT 'pending',
  response_notes TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_availability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_availability_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availability requests
CREATE POLICY "Users can view availability requests for their bookings"
ON public.booking_availability_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking_offers bo
    JOIN public.artist_role_bindings arb ON arb.artist_id = bo.artist_id
    WHERE bo.id = booking_id AND arb.user_id = auth.uid()
  )
  OR
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can create availability requests for their bookings"
ON public.booking_availability_requests
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update availability requests for their bookings"
ON public.booking_availability_requests
FOR UPDATE
USING (
  auth.role() = 'authenticated'
);

-- RLS Policies for availability responses
CREATE POLICY "Users can view responses"
ON public.booking_availability_responses
FOR SELECT
USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can create responses"
ON public.booking_availability_responses
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update responses"
ON public.booking_availability_responses
FOR UPDATE
USING (
  auth.role() = 'authenticated'
);

-- Add index for performance
CREATE INDEX idx_availability_requests_booking ON public.booking_availability_requests(booking_id);
CREATE INDEX idx_availability_responses_request ON public.booking_availability_responses(request_id);
CREATE INDEX idx_availability_requests_share_token ON public.booking_availability_requests(share_token);