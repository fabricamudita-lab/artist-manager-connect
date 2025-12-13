-- Add content column to booking_documents table to store contract content
ALTER TABLE public.booking_documents 
ADD COLUMN content TEXT;