-- Add oferta column to solicitudes table for license requests
ALTER TABLE public.solicitudes 
ADD COLUMN oferta text;