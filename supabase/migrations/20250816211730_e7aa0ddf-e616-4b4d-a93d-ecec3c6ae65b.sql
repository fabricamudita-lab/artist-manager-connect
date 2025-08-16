-- Update default status options to include Propuesta
INSERT INTO public.booking_status_options (status_value, is_default, created_by)
VALUES ('Propuesta', true, '00000000-0000-0000-0000-000000000000'::uuid)
ON CONFLICT (status_value) DO NOTHING;