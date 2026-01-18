-- Add is_tour_party column to booking_product_crew
-- This indicates whether the crew member travels with the tour party
ALTER TABLE public.booking_product_crew 
ADD COLUMN is_tour_party boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.booking_product_crew.is_tour_party IS 'Indicates if this crew member is part of the traveling tour party';