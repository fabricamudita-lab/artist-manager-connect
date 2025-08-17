-- Add event_id column to booking_offers table to link with calendar events
ALTER TABLE public.booking_offers 
ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;