-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-tracks', 'audio-tracks', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to audio-tracks bucket
CREATE POLICY "Authenticated users can upload audio tracks"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-tracks');

-- Allow public read access
CREATE POLICY "Public can view audio tracks"
ON storage.objects
FOR SELECT
USING (bucket_id = 'audio-tracks');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete their audio tracks"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audio-tracks');

-- Enable RLS on track_versions if not already
ALTER TABLE public.track_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for track_versions
CREATE POLICY "Authenticated can view track versions"
ON public.track_versions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert track versions"
ON public.track_versions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update track versions"
ON public.track_versions
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete track versions"
ON public.track_versions
FOR DELETE
TO authenticated
USING (true);