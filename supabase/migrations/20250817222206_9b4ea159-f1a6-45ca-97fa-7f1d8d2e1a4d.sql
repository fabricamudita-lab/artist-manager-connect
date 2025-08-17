-- Add folderUrl field to booking_offers table
ALTER TABLE public.booking_offers 
ADD COLUMN folder_url TEXT;