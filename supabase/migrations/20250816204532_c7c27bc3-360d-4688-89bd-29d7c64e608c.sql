-- Create booking offers table
CREATE TABLE public.booking_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha date,
  festival_ciclo text,
  ciudad text,
  lugar text,
  capacidad integer,
  estado text DEFAULT 'pendiente',
  oferta text,
  formato text,
  contacto text,
  tour_manager text,
  info_comentarios text,
  condiciones text,
  link_venta text,
  inicio_venta date,
  contratos text,
  artist_id uuid,
  project_id uuid,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create booking template configuration table
CREATE TABLE public.booking_template_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  field_order integer NOT NULL,
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_template_config ENABLE ROW LEVEL SECURITY;

-- Create policies for booking_offers
CREATE POLICY "Users can view booking offers" 
ON public.booking_offers 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create booking offers" 
ON public.booking_offers 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update booking offers" 
ON public.booking_offers 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete booking offers" 
ON public.booking_offers 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Create policies for booking_template_config
CREATE POLICY "Users can view template config" 
ON public.booking_template_config 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create template config" 
ON public.booking_template_config 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update template config" 
ON public.booking_template_config 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete template config" 
ON public.booking_template_config 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Create trigger for updated_at
CREATE TRIGGER update_booking_offers_updated_at
BEFORE UPDATE ON public.booking_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_template_config_updated_at
BEFORE UPDATE ON public.booking_template_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template configuration
INSERT INTO public.booking_template_config (field_name, field_label, field_type, field_order, is_required, created_by) VALUES
('fecha', 'Fecha', 'date', 1, true, '00000000-0000-0000-0000-000000000000'),
('festival_ciclo', 'Festival / Ciclo', 'text', 2, false, '00000000-0000-0000-0000-000000000000'),
('ciudad', 'Ciudad', 'text', 3, false, '00000000-0000-0000-0000-000000000000'),
('lugar', 'Lugar', 'text', 4, false, '00000000-0000-0000-0000-000000000000'),
('capacidad', 'Capacidad', 'number', 5, false, '00000000-0000-0000-0000-000000000000'),
('estado', 'Estado', 'select', 6, false, '00000000-0000-0000-0000-000000000000'),
('oferta', 'Oferta', 'text', 7, false, '00000000-0000-0000-0000-000000000000'),
('formato', 'Formato', 'select', 8, false, '00000000-0000-0000-0000-000000000000'),
('contacto', 'Contacto', 'text', 9, false, '00000000-0000-0000-0000-000000000000'),
('tour_manager', 'Tour Manager', 'text', 10, false, '00000000-0000-0000-0000-000000000000'),
('info_comentarios', 'Info / Comentarios', 'textarea', 11, false, '00000000-0000-0000-0000-000000000000'),
('condiciones', 'Condiciones', 'textarea', 12, false, '00000000-0000-0000-0000-000000000000'),
('link_venta', 'Link de venta', 'url', 13, false, '00000000-0000-0000-0000-000000000000'),
('inicio_venta', 'Inicio venta', 'date', 14, false, '00000000-0000-0000-0000-000000000000'),
('contratos', 'Contratos', 'text', 15, false, '00000000-0000-0000-0000-000000000000');