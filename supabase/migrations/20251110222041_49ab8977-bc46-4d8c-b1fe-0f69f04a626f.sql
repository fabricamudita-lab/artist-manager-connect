-- Enable RLS on artists table if not already enabled
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view artists
CREATE POLICY "Users can view artists"
ON public.artists
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create artists
CREATE POLICY "Users can create artists"
ON public.artists
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update artists
CREATE POLICY "Users can update artists"
ON public.artists
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete artists
CREATE POLICY "Users can delete artists"
ON public.artists
FOR DELETE
TO authenticated
USING (true);