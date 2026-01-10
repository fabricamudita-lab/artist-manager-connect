-- Drop the existing foreign key constraint and recreate with ON DELETE SET NULL
ALTER TABLE public.solicitudes DROP CONSTRAINT IF EXISTS solicitudes_booking_id_fkey;

ALTER TABLE public.solicitudes 
ADD CONSTRAINT solicitudes_booking_id_fkey 
FOREIGN KEY (booking_id) REFERENCES public.booking_offers(id) ON DELETE SET NULL;