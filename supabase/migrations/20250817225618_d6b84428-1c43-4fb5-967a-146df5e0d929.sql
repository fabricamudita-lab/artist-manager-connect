-- Check if documents bucket exists and create storage policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for documents bucket
CREATE POLICY "Authenticated users can view documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can create documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update documents" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'documents');