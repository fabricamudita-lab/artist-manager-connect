-- Crear tabla para manejar múltiples artistas por evento
CREATE TABLE public.event_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, artist_id)
);

-- Agregar columnas para coordenadas geográficas en la tabla events
ALTER TABLE public.events 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;

-- Políticas para event_artists
CREATE POLICY "Users can view event artists" 
ON public.event_artists 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create event artists" 
ON public.event_artists 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update event artists" 
ON public.event_artists 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete event artists" 
ON public.event_artists 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);