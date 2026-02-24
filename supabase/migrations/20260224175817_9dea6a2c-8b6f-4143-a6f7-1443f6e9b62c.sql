
-- Create release-assets storage bucket (public for direct image display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('release-assets', 'release-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload release assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'release-assets');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read release assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'release-assets');

-- Allow public read access (bucket is public)
CREATE POLICY "Public can read release assets"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'release-assets');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete release assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'release-assets');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update release assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'release-assets');
