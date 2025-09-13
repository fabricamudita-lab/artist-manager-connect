-- Create a bucket for invoices/facturas
INSERT INTO storage.buckets (id, name, public) VALUES ('facturas', 'facturas', false);

-- Create RLS policies for facturas bucket
CREATE POLICY "Users can view their facturas" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'facturas' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload facturas" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'facturas' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their facturas" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'facturas' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their facturas" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'facturas' AND auth.role() = 'authenticated');