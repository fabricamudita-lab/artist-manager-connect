-- Add booking_id column to tour_roadmaps table
ALTER TABLE public.tour_roadmaps 
ADD COLUMN booking_id UUID REFERENCES public.booking_offers(id) ON DELETE SET NULL;