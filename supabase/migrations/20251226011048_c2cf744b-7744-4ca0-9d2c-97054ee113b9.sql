-- Add foreign key from booking_offers.artist_id to artists.id
ALTER TABLE public.booking_offers
ADD CONSTRAINT booking_offers_artist_id_fkey
FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;