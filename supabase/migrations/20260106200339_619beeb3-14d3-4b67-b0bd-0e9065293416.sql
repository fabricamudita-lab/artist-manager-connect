-- Create table for custom room types (user-defined)
CREATE TABLE public.custom_room_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_room_types ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all room types
CREATE POLICY "Users can view all room types" 
ON public.custom_room_types 
FOR SELECT 
USING (true);

-- Allow authenticated users to create room types
CREATE POLICY "Users can create room types" 
ON public.custom_room_types 
FOR INSERT 
WITH CHECK (true);

-- Insert default room types
INSERT INTO public.custom_room_types (name, capacity, created_by) VALUES
  ('Single', 1, 'system'),
  ('Doble', 2, 'system'),
  ('Twin', 2, 'system'),
  ('Suite', 3, 'system'),
  ('Triple', 3, 'system'),
  ('Familiar', 4, 'system');