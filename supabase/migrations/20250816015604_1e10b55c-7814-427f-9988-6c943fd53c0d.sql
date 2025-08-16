-- Agregar campo archived a la tabla solicitudes
ALTER TABLE public.solicitudes 
ADD COLUMN archived boolean NOT NULL DEFAULT false;