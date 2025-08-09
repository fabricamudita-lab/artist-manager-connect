-- Add optional response deadline to solicitudes so UI can show days remaining
ALTER TABLE public.solicitudes
ADD COLUMN IF NOT EXISTS fecha_limite_respuesta timestamp with time zone NULL;