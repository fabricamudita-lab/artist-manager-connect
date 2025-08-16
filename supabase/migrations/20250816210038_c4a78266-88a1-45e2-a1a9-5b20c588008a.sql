-- Create table for custom booking status options
CREATE TABLE IF NOT EXISTS public.booking_status_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_value text NOT NULL UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_status_options ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view status options" ON public.booking_status_options
  FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create status options" ON public.booking_status_options
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);

-- Insert default status options
INSERT INTO public.booking_status_options (status_value, is_default, created_by)
VALUES 
  ('Confirmado', true, '00000000-0000-0000-0000-000000000000'::uuid),
  ('Interés', true, '00000000-0000-0000-0000-000000000000'::uuid),
  ('Cancelado', true, '00000000-0000-0000-0000-000000000000'::uuid)
ON CONFLICT (status_value) DO NOTHING;