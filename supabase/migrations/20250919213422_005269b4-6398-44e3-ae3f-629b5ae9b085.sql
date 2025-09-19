-- Create enums for EPK
CREATE TYPE epk_visibility AS ENUM ('publico', 'privado', 'protegido_password');
CREATE TYPE epk_theme AS ENUM ('auto', 'claro', 'oscuro');
CREATE TYPE epk_video_type AS ENUM ('youtube', 'vimeo', 'archivo');

-- Create main EPK table
CREATE TABLE public.epks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  artista_proyecto text NOT NULL,
  tagline text,
  imagen_portada text, -- URL to storage
  tema epk_theme DEFAULT 'auto',
  
  -- Textos
  bio_corta text, -- Rich text content
  nota_prensa_pdf text, -- URL to PDF file
  
  -- Contactos (JSON objects with nombre, email, telefono, whatsapp, mostrar fields)
  tour_manager jsonb DEFAULT '{"nombre": "", "email": "", "telefono": "", "whatsapp": "", "mostrar": false}'::jsonb,
  tour_production jsonb DEFAULT '{"nombre": "", "email": "", "telefono": "", "whatsapp": "", "mostrar": false}'::jsonb,
  coordinadora_booking jsonb DEFAULT '{"nombre": "", "email": "", "telefono": "", "whatsapp": "", "mostrar": false}'::jsonb,
  management jsonb DEFAULT '{"nombre": "", "email": "", "telefono": "", "whatsapp": "", "mostrar": false}'::jsonb,
  booking jsonb DEFAULT '{"nombre": "", "email": "", "telefono": "", "whatsapp": "", "mostrar": false}'::jsonb,
  
  -- Acceso y control
  visibilidad epk_visibility DEFAULT 'privado',
  password_hash text,
  expira_el timestamp with time zone,
  permitir_zip boolean DEFAULT true,
  rastrear_analiticas boolean DEFAULT true,
  
  -- Vinculaciones
  presupuesto_id uuid REFERENCES public.budgets(id),
  proyecto_id uuid REFERENCES public.projects(id),
  etiquetas text[] DEFAULT ARRAY[]::text[],
  
  -- Métricas (solo lectura)
  vistas_totales integer DEFAULT 0,
  vistas_unicas integer DEFAULT 0,
  descargas_totales integer DEFAULT 0,
  ultima_vista_en timestamp with time zone,
  
  -- Timestamps
  creado_en timestamp with time zone DEFAULT now(),
  actualizado_en timestamp with time zone DEFAULT now(),
  creado_por uuid NOT NULL REFERENCES public.profiles(id)
);

-- Create EPK photos table
CREATE TABLE public.epk_fotos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epk_id uuid NOT NULL REFERENCES public.epks(id) ON DELETE CASCADE,
  titulo text,
  url text NOT NULL,
  descargable boolean DEFAULT true,
  orden integer DEFAULT 0,
  creado_en timestamp with time zone DEFAULT now()
);

-- Create EPK videos table
CREATE TABLE public.epk_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epk_id uuid NOT NULL REFERENCES public.epks(id) ON DELETE CASCADE,
  tipo epk_video_type NOT NULL,
  url text, -- For archivo type
  video_id text, -- For youtube/vimeo ID
  titulo text NOT NULL,
  privado boolean DEFAULT false,
  orden integer DEFAULT 0,
  creado_en timestamp with time zone DEFAULT now()
);

-- Create EPK audios table
CREATE TABLE public.epk_audios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epk_id uuid NOT NULL REFERENCES public.epks(id) ON DELETE CASCADE,
  url text NOT NULL, -- Enlace/embebido
  titulo text NOT NULL,
  orden integer DEFAULT 0,
  creado_en timestamp with time zone DEFAULT now()
);

-- Create EPK documents table
CREATE TABLE public.epk_documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epk_id uuid NOT NULL REFERENCES public.epks(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  tipo text, -- rider, stage_plot, press_quotes, etc.
  url text NOT NULL,
  file_type text,
  file_size integer,
  orden integer DEFAULT 0,
  creado_en timestamp with time zone DEFAULT now()
);

-- Create EPK analytics table for tracking
CREATE TABLE public.epk_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  epk_id uuid NOT NULL REFERENCES public.epks(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  referrer text,
  accion text, -- vista, descarga, etc.
  recurso text, -- que foto/video/documento se accedió
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_epks_slug ON public.epks(slug);
CREATE INDEX idx_epks_creado_por ON public.epks(creado_por);
CREATE INDEX idx_epks_proyecto_id ON public.epks(proyecto_id);
CREATE INDEX idx_epks_presupuesto_id ON public.epks(presupuesto_id);
CREATE INDEX idx_epks_visibilidad ON public.epks(visibilidad);
CREATE INDEX idx_epk_fotos_epk_id ON public.epk_fotos(epk_id);
CREATE INDEX idx_epk_videos_epk_id ON public.epk_videos(epk_id);
CREATE INDEX idx_epk_audios_epk_id ON public.epk_audios(epk_id);
CREATE INDEX idx_epk_documentos_epk_id ON public.epk_documentos(epk_id);
CREATE INDEX idx_epk_analytics_epk_id ON public.epk_analytics(epk_id);

-- Create trigger to update actualizado_en
CREATE TRIGGER update_epks_updated_at
  BEFORE UPDATE ON public.epks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.epks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epk_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epk_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epk_audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epk_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epk_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for EPKs
CREATE POLICY "Users can view public EPKs" ON public.epks
  FOR SELECT USING (visibilidad = 'publico' OR (expira_el IS NULL OR expira_el > now()));

CREATE POLICY "Users can view their own EPKs" ON public.epks
  FOR SELECT USING (creado_por = auth.uid());

CREATE POLICY "Users can create EPKs" ON public.epks
  FOR INSERT WITH CHECK (creado_por = auth.uid());

CREATE POLICY "Users can update their own EPKs" ON public.epks
  FOR UPDATE USING (creado_por = auth.uid());

CREATE POLICY "Users can delete their own EPKs" ON public.epks
  FOR DELETE USING (creado_por = auth.uid());

-- RLS Policies for EPK related tables (fotos, videos, audios, documentos)
CREATE POLICY "Users can view EPK fotos for accessible EPKs" ON public.epk_fotos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_fotos.epk_id 
      AND (visibilidad = 'publico' OR creado_por = auth.uid())
    )
  );

CREATE POLICY "Users can manage fotos for their EPKs" ON public.epk_fotos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_fotos.epk_id 
      AND creado_por = auth.uid()
    )
  );

CREATE POLICY "Users can view EPK videos for accessible EPKs" ON public.epk_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_videos.epk_id 
      AND (visibilidad = 'publico' OR creado_por = auth.uid())
    )
  );

CREATE POLICY "Users can manage videos for their EPKs" ON public.epk_videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_videos.epk_id 
      AND creado_por = auth.uid()
    )
  );

CREATE POLICY "Users can view EPK audios for accessible EPKs" ON public.epk_audios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_audios.epk_id 
      AND (visibilidad = 'publico' OR creado_por = auth.uid())
    )
  );

CREATE POLICY "Users can manage audios for their EPKs" ON public.epk_audios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_audios.epk_id 
      AND creado_por = auth.uid()
    )
  );

CREATE POLICY "Users can view EPK documentos for accessible EPKs" ON public.epk_documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_documentos.epk_id 
      AND (visibilidad = 'publico' OR creado_por = auth.uid())
    )
  );

CREATE POLICY "Users can manage documentos for their EPKs" ON public.epk_documentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_documentos.epk_id 
      AND creado_por = auth.uid()
    )
  );

-- RLS Policies for analytics (only owners can see their analytics)
CREATE POLICY "Users can view analytics for their EPKs" ON public.epk_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.epks 
      WHERE id = epk_analytics.epk_id 
      AND creado_por = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics" ON public.epk_analytics
  FOR INSERT WITH CHECK (true);

-- Create function to increment EPK views
CREATE OR REPLACE FUNCTION public.increment_epk_view(epk_slug text, visitor_ip inet DEFAULT NULL, is_unique boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.epks 
  SET 
    vistas_totales = vistas_totales + 1,
    vistas_unicas = CASE WHEN is_unique THEN vistas_unicas + 1 ELSE vistas_unicas END,
    ultima_vista_en = now()
  WHERE slug = epk_slug;
  
  -- Insert analytics record if tracking is enabled
  INSERT INTO public.epk_analytics (epk_id, ip_address, accion)
  SELECT id, visitor_ip, 'vista'
  FROM public.epks 
  WHERE slug = epk_slug AND rastrear_analiticas = true;
END;
$$;

-- Create function to increment downloads
CREATE OR REPLACE FUNCTION public.increment_epk_download(epk_slug text, recurso text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.epks 
  SET descargas_totales = descargas_totales + 1
  WHERE slug = epk_slug;
  
  -- Insert analytics record if tracking is enabled
  INSERT INTO public.epk_analytics (epk_id, accion, recurso)
  SELECT id, 'descarga', recurso
  FROM public.epks 
  WHERE slug = epk_slug AND rastrear_analiticas = true;
END;
$$;