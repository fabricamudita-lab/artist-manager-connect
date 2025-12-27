-- Add missing booking fields to solicitudes table
-- Priority field for all solicitudes
ALTER TABLE public.solicitudes 
ADD COLUMN IF NOT EXISTS prioridad text DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente'));

-- Additional booking-specific fields matching CreateBookingWizard
ALTER TABLE public.solicitudes 
ADD COLUMN IF NOT EXISTS pais text,
ADD COLUMN IF NOT EXISTS direccion text,
ADD COLUMN IF NOT EXISTS capacidad integer,
ADD COLUMN IF NOT EXISTS fechas_opcionales jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fee numeric,
ADD COLUMN IF NOT EXISTS deal_type text CHECK (deal_type IS NULL OR deal_type IN ('flat_fee', 'door_split')),
ADD COLUMN IF NOT EXISTS door_split_percentage numeric,
ADD COLUMN IF NOT EXISTS condiciones text,
ADD COLUMN IF NOT EXISTS promotor_contact_id uuid REFERENCES public.contacts(id);