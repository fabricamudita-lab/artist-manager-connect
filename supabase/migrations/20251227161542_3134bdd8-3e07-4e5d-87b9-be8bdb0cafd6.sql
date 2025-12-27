-- Add booking-related fields to solicitudes for linking and multi-approval workflow
ALTER TABLE public.solicitudes
ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.booking_offers(id),
ADD COLUMN IF NOT EXISTS booking_status text DEFAULT 'interest',
ADD COLUMN IF NOT EXISTS required_approvers uuid[] DEFAULT ARRAY[]::uuid[],
ADD COLUMN IF NOT EXISTS current_approvals uuid[] DEFAULT ARRAY[]::uuid[];

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_solicitudes_booking_id ON public.solicitudes(booking_id);

-- Comment the columns
COMMENT ON COLUMN public.solicitudes.booking_id IS 'Reference to linked booking_offers record';
COMMENT ON COLUMN public.solicitudes.booking_status IS 'Target booking status (interest, oferta, confirmado, cancelado)';
COMMENT ON COLUMN public.solicitudes.required_approvers IS 'Array of user IDs required to approve this solicitud';
COMMENT ON COLUMN public.solicitudes.current_approvals IS 'Array of user IDs who have approved this solicitud';