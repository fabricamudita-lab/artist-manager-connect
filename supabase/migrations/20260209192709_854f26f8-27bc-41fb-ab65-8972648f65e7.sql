
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-avatars', 'contact-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload contact avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contact-avatars');

CREATE POLICY "Contact avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contact-avatars');

CREATE POLICY "Users can manage their contact avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contact-avatars');

CREATE POLICY "Users can update contact avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contact-avatars');
