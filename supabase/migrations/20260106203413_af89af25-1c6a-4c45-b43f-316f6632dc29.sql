-- Allow NULL capacity for unlimited room types like Apartamento
ALTER TABLE public.custom_room_types 
ALTER COLUMN capacity DROP NOT NULL;

-- Add Apartamento room type with null capacity (unlimited)
INSERT INTO public.custom_room_types (name, capacity, created_by)
VALUES ('Apartamento', NULL, 'system')
ON CONFLICT DO NOTHING;